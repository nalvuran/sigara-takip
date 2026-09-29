import { SMOKE_REASONS } from "./reasons";
import { getLocalHour, toLocalWeekdayName, addDaysToDateString } from "./dateUtils";
import { formatMinutesAsDuration } from "./allowance";
import { QUOTES, type Quote } from "./quotes";

/**
 * YORUMLAR — TASARIM İLKESİ
 * --------------------------
 * Bu motor tek bir sinyale bakmaz; kullanıcının verisindeki BİRDEN FAZLA
 * parametreyi (kaç sigara, hangi sebep, hangi saat, hangi aralıkta, ne kadar
 * uzun/kısa süre) tek bir akıcı paragrafta birleştirir ("sentez"), sonuna da
 * mümkünse bir ZAMAN KARŞILAŞTIRMASI ekler ("iki hafta önce ... şimdi ...").
 * Amaç kısa bir "fun fact" değil, okuyanın "bunu fark etmemiştim" diyeceği
 * çarpıcı ama tamamen NÖTR bir gözlemdir. Asla "azaltmalısın", "iyi
 * gidiyorsun" gibi bir yön/değer yargısı içermez — sadece veriyi gösterir.
 * Paragrafın ardından, kişiyi kendi içine bakmaya çağıran açık uçlu bir SORU
 * ve konuyla ilgili, kaynağı doğrulanabilir bir SÖZ gelir.
 *
 * TEKRAR ETMEME: Her gün gösterilen kart (`ShownRecord`) kaydedilir. Ertesi
 * gün ana tema ("anchor"), o temanın anlatım biçimi, soru ve söz; dünkü hariç
 * tutularak ve en az kullanılandan seçilir.
 */

export interface InsightSmoke {
  timestamp: number;
  localDate: string;
  reason?: string | null;
}

export interface ShownRecord {
  date: string;
  insightId: string; // anchor tema id'si
  obsIdx: number; // o temanın hangi anlatım biçimi kullanıldı
  qIdx: number;
  quoteId: string;
}

export interface DailyInsight extends ShownRecord {
  observation: string; // çok parametreli sentez + (varsa) zaman karşılaştırması
  question: string;
  quote: Quote;
}

type Daypart = "gece" | "sabah" | "öğleden sonra" | "akşam";

function daypartOf(hour: number): Daypart {
  if (hour >= 0 && hour < 6) return "gece";
  if (hour >= 6 && hour < 12) return "sabah";
  if (hour >= 12 && hour < 18) return "öğleden sonra";
  return "akşam";
}

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part * 100) / total) : 0;
}

function hh(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function mean(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

/** Aynı gün içindeki ardışık sigaralar arası süreler (gece boyu süren aralar dahil değil). */
function withinDayIntervals(
  smokes: InsightSmoke[]
): { minutes: number; reason: string | null }[] {
  const byDate = new Map<string, InsightSmoke[]>();
  for (const s of smokes) {
    const arr = byDate.get(s.localDate) ?? [];
    arr.push(s);
    byDate.set(s.localDate, arr);
  }
  const out: { minutes: number; reason: string | null }[] = [];
  for (const list of byDate.values()) {
    list.sort((a, b) => a.timestamp - b.timestamp);
    for (let i = 1; i < list.length; i++) {
      out.push({
        minutes: (list[i].timestamp - list[i - 1].timestamp) / 60000,
        reason: list[i].reason ?? null,
      });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 1) SİNYALLER: ham verinin tek seferde çıkarılmış hâli                */
/* ------------------------------------------------------------------ */

interface ReasonSignal {
  id: string;
  label: string;
  count: number;
  percent: number;
  topDaypart: Daypart;
  topDaypartPercent: number;
  avgIntervalMinutes: number | null;
  intervalRatioVsOverall: number | null; // (kendi - genel) / genel
}

export interface Signals {
  total: number;
  daysTracked: number;
  reasons: ReasonSignal[]; // en az 3 kayıtlı sebepler, count'a göre azalan
  dominant: ReasonSignal | null;
  overallAvgIntervalMinutes: number | null;
  longestGapMinutes: number | null;
  busiestHour: { hour: number; count: number } | null;
  weekdayCluster: { day: string; count: number; avg: number } | null;
  firstSmokeAvgHour: number | null;
  unspecifiedPercent: number;
  distinctReasonsUsed: number;
  recentVsPrevious: {
    recentAvg: number;
    previousAvg: number;
    windowDays: number;
  } | null;
  dailyRangeRecent: { min: number; max: number; windowDays: number } | null;
}

export function computeSignals(smokes: InsightSmoke[], today: string): Signals {
  const total = smokes.length;
  const dailyCounts = new Map<string, number>();
  for (const s of smokes) dailyCounts.set(s.localDate, (dailyCounts.get(s.localDate) ?? 0) + 1);
  const daysTracked = dailyCounts.size;

  const dayIntervals = withinDayIntervals(smokes);
  const overallAvgIntervalMinutes = dayIntervals.length
    ? mean(dayIntervals.map((i) => i.minutes))
    : null;

  const sortedAll = [...smokes].sort((a, b) => a.timestamp - b.timestamp);
  const allGapMinutes: number[] = [];
  for (let i = 1; i < sortedAll.length; i++) {
    allGapMinutes.push((sortedAll[i].timestamp - sortedAll[i - 1].timestamp) / 60000);
  }
  const longestGapMinutes = allGapMinutes.length ? Math.max(...allGapMinutes) : null;

  const reasons: ReasonSignal[] = [];
  for (const def of SMOKE_REASONS) {
    const list = smokes.filter((s) => s.reason === def.id);
    if (list.length < 3) continue;

    const buckets: Record<Daypart, number> = { gece: 0, sabah: 0, "öğleden sonra": 0, akşam: 0 };
    for (const s of list) buckets[daypartOf(getLocalHour(s.timestamp))]++;
    const [topDaypart, topDaypartCount] = (
      Object.entries(buckets) as [Daypart, number][]
    ).sort((a, b) => b[1] - a[1])[0];

    const ownIntervals = dayIntervals.filter((i) => i.reason === def.id).map((i) => i.minutes);
    const avgIntervalMinutes = ownIntervals.length ? mean(ownIntervals) : null;
    const intervalRatioVsOverall =
      avgIntervalMinutes !== null && overallAvgIntervalMinutes
        ? (avgIntervalMinutes - overallAvgIntervalMinutes) / overallAvgIntervalMinutes
        : null;

    reasons.push({
      id: def.id,
      label: def.label,
      count: list.length,
      percent: pct(list.length, total),
      topDaypart,
      topDaypartPercent: pct(topDaypartCount, list.length),
      avgIntervalMinutes,
      intervalRatioVsOverall,
    });
  }
  reasons.sort((a, b) => b.count - a.count);
  const dominant = reasons.length && reasons[0].percent >= 25 ? reasons[0] : null;

  let busiestHour: Signals["busiestHour"] = null;
  if (total >= 10) {
    const hourCounts = new Map<number, number>();
    for (const s of smokes) {
      const h = getLocalHour(s.timestamp);
      hourCounts.set(h, (hourCounts.get(h) ?? 0) + 1);
    }
    const [hour, count] = [...hourCounts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
    if (count >= Math.max(3, total * 0.15)) busiestHour = { hour, count };
  }

  let weekdayCluster: Signals["weekdayCluster"] = null;
  if (total >= 14) {
    const dayCounts = new Map<string, number>();
    for (const s of smokes) {
      const day = toLocalWeekdayName(s.timestamp);
      dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
    }
    const avg = total / dayCounts.size;
    const [day, count] = [...dayCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (count >= avg * 1.5 && count >= 5) weekdayCluster = { day, count, avg };
  }

  let firstSmokeAvgHour: number | null = null;
  {
    const earliest = new Map<string, number>();
    for (const s of smokes) {
      const cur = earliest.get(s.localDate);
      if (cur === undefined || s.timestamp < cur) earliest.set(s.localDate, s.timestamp);
    }
    if (earliest.size >= 7) {
      firstSmokeAvgHour = mean([...earliest.values()].map((ts) => getLocalHour(ts)));
    }
  }

  const known = new Set(SMOKE_REASONS.map((r) => r.id));
  const unspecifiedCount = smokes.filter((s) => !s.reason || !known.has(s.reason)).length;
  const unspecifiedPercent = pct(unspecifiedCount, total);
  const distinctReasonsUsed = new Set(
    smokes.map((s) => s.reason).filter((r): r is string => !!r && known.has(r))
  ).size;

  let recentVsPrevious: Signals["recentVsPrevious"] = null;
  {
    const windowDays = 14;
    const startRecent = addDaysToDateString(today, -(windowDays - 1));
    const startPrev = addDaysToDateString(today, -(windowDays * 2 - 1));
    const recent: number[] = [];
    const previous: number[] = [];
    for (const [date, count] of dailyCounts) {
      if (date >= startRecent && date <= today) recent.push(count);
      else if (date >= startPrev && date < startRecent) previous.push(count);
    }
    if (recent.length >= 5 && previous.length >= 5) {
      const recentAvg = mean(recent);
      const previousAvg = mean(previous);
      if (Math.abs(recentAvg - previousAvg) >= 1) {
        recentVsPrevious = { recentAvg, previousAvg, windowDays };
      }
    }
  }

  let dailyRangeRecent: Signals["dailyRangeRecent"] = null;
  {
    const windowDays = 14;
    const start = addDaysToDateString(today, -(windowDays - 1));
    const counts = [...dailyCounts.entries()]
      .filter(([d]) => d >= start && d <= today)
      .map(([, c]) => c);
    if (counts.length >= 7) {
      const min = Math.min(...counts);
      const max = Math.max(...counts);
      if (max - min >= 3) dailyRangeRecent = { min, max, windowDays };
    }
  }

  return {
    total,
    daysTracked,
    reasons,
    dominant,
    overallAvgIntervalMinutes,
    longestGapMinutes,
    busiestHour,
    weekdayCluster,
    firstSmokeAvgHour,
    unspecifiedPercent,
    distinctReasonsUsed,
    recentVsPrevious,
    dailyRangeRecent,
  };
}

/* ------------------------------------------------------------------ */
/* 2) ZAMAN KARŞILAŞTIRMASI: her paragrafın sonuna (varsa) eklenir       */
/* ------------------------------------------------------------------ */

function buildComparisonSentence(signals: Signals): string | null {
  const c = signals.recentVsPrevious;
  if (!c) return null;
  const a = c.recentAvg.toFixed(1);
  const b = c.previousAvg.toFixed(1);
  const variants = [
    `Son ${c.windowDays} günün günlük ortalaması ${a}; ondan önceki ${c.windowDays} günde bu ${b}'ydi.`,
    `Karşılaştırınca: son ${c.windowDays} günde günde ortalama ${a} sigara, önceki ${c.windowDays} günde ${b}.`,
    `İki dönemi yan yana koyunca fark görünüyor — son ${c.windowDays} gün ${a}, önceki ${c.windowDays} gün ${b}.`,
  ];
  const idx = Math.abs(hashString(`${signals.total}-${a}-${b}`)) % variants.length;
  return variants[idx];
}

/* ------------------------------------------------------------------ */
/* 3) ANCHOR TEMALAR: her biri birden fazla sinyali tek pasajda örer     */
/* ------------------------------------------------------------------ */

interface Anchor {
  id: string;
  themes: string[]; // söz eşleştirme için
  eligible: (s: Signals) => boolean;
  paragraphs: (s: Signals) => string[]; // birden fazla anlatım biçimi (rotasyon için)
  questions: string[];
}

const ANCHORS: Anchor[] = [
  // Baskın sebep × zaman dilimi × tempo — en zengin sentez
  {
    id: "dominant-reason-synthesis",
    themes: ["sebep", "ritim", "kendini-bil"],
    eligible: (s) => !!s.dominant && s.dominant.topDaypartPercent >= 55,
    paragraphs: (s) => {
      const d = s.dominant!;
      const tempoSentence =
        d.intervalRatioVsOverall !== null
          ? d.intervalRatioVsOverall <= -0.2
            ? ` Bu anlarda sigaralar birbirini genel ortalamana göre belirgin şekilde daha hızlı kovalıyor.`
            : d.intervalRatioVsOverall >= 0.2
              ? ` İlginç olan şu ki bu anlarda sigaralar arasında genel ortalamana göre daha uzun süre geçiyor.`
              : ""
          : "";
      const gapSentence =
        s.longestGapMinutes !== null && s.longestGapMinutes >= 240
          ? ` En uzun sigarasız süren (${formatMinutesAsDuration(s.longestGapMinutes)}) de kayıtlarında öne çıkan bir başka nokta.`
          : "";
      return [
        `Son ${s.daysTracked} günde ${s.total} sigara işaretlemişsin. Bunun %${d.percent}'i "${d.label}" — en sık tekrar eden neden bu. Bu sebeple işaretlediklerinin %${d.topDaypartPercent} kadarı ${s.dominant!.topDaypart} saatlerinde toplanmış.${tempoSentence}${gapSentence}`,
        `${s.total} kayıdının %${d.percent}'inde neden "${d.label}" olarak işaretlenmiş — bu senin en baskın örüntün. Bu sebep neredeyse hep aynı zaman dilimine, ${s.dominant!.topDaypart} saatlerine denk geliyor (%${d.topDaypartPercent}).${tempoSentence}${gapSentence}`,
      ];
    },
    questions: [
      "O saatlerde seni sigaraya götüren şey ne olabilir?",
      "Bu örüntüyü daha önce fark etmiş miydin?",
      "O anlarda başka ne yapıyor olurdun?",
      "Bu ihtiyaca başka neler cevap verebilir?",
    ],
  },

  // Hafta içi gün kümelenmesi + o günkü baskın sebep
  {
    id: "weekday-synthesis",
    themes: ["ritim", "zaman", "farkindalik"],
    eligible: (s) => !!s.weekdayCluster,
    paragraphs: (s) => {
      const w = s.weekdayCluster!;
      const ratio = Math.round((w.count / w.avg) * 10) / 10;
      return [
        `Haftanın günlerine bakınca ${w.day} günleri öne çıkıyor: o gün ortalama ${w.avg.toFixed(1)} yerine ${w.count} sigara içilmiş, yani ortalamanın yaklaşık ${ratio} katı. Bu, ${s.daysTracked} günlük veride en belirgin gün-bazlı fark.`,
        `${s.daysTracked} günlük kayıtlarında haftanın en yoğun günü ${w.day} — o gün sayı ${w.count}'a çıkıyor, genel günlük ortalaman ise ${w.avg.toFixed(1)}.`,
      ];
    },
    questions: [
      "O günü diğer günlerden ayıran ne?",
      "O günün akışında neler var?",
      "O gün kimlerle, nerede oluyorsun?",
    ],
  },

  // Günün ilk sigarası + genel ritim (en yoğun saat + ortalama aralık)
  {
    id: "rhythm-synthesis",
    themes: ["ritim", "aliskanlik", "farkindalik"],
    eligible: (s) => s.firstSmokeAvgHour !== null && s.overallAvgIntervalMinutes !== null,
    paragraphs: (s) => {
      const hour = Math.round(s.firstSmokeAvgHour!);
      const avgDur = formatMinutesAsDuration(s.overallAvgIntervalMinutes!);
      const busy =
        s.busiestHour !== null
          ? ` Günün en yoğun saati ${hh(s.busiestHour.hour)} civarı.`
          : "";
      return [
        `Günün ilk sigarası genelde saat ${hour}:00 sularında geliyor. Ondan sonra, gün içinde sigaralar arasında ortalama ${avgDur} geçiyor.${busy}`,
        `Güne saat ${hour}:00 civarında bir sigarayla başlıyorsun, sonrasında gün boyu ortalama ${avgDur}'lık aralıklarla devam ediyor.${busy}`,
      ];
    },
    questions: [
      "Güne başlarken o anda ne arıyorsun?",
      "Bu ritim sana tanıdık mı geldi?",
      "Gün içindeki bu düzeni daha önce fark etmiş miydin?",
    ],
  },

  // Sebep çeşitliliği + belirtilmeyenler
  {
    id: "diversity-synthesis",
    themes: ["kendini-bil", "sebep", "farkindalik"],
    eligible: (s) => s.total >= 12 && s.distinctReasonsUsed >= 3,
    paragraphs: (s) => {
      const top = s.reasons[0];
      const unspecified =
        s.unspecifiedPercent >= 25
          ? ` Kayıtlarının %${s.unspecifiedPercent} kadarında ise hiç neden işaretlenmemiş.`
          : "";
      return [
        `${s.total} kaydında ${s.distinctReasonsUsed} farklı neden işaretlemişsin — tek bir kalıba sıkışmıyorsun. Yine de en sık geleni "${top.label}" (%${top.percent}).${unspecified}`,
        `Nedenlerin oldukça çeşitli: ${s.distinctReasonsUsed} farklı kategori kullanmışsın. Ama içlerinde "${top.label}" belirgin şekilde öne çıkıyor, kayıtlarının %${top.percent} kadarında bu neden var.${unspecified}`,
      ];
    },
    questions: [
      "Bu nedenlerin ortak bir yanı var mı?",
      "Hangisi seni en çok yoruyor?",
      "Hangi neden sana en yabancı geliyor?",
    ],
  },

  // Boşluklar: en uzun süre + en kısa aralık + günlük değişkenlik
  {
    id: "gaps-synthesis",
    themes: ["sukunet", "zaman", "degisim"],
    eligible: (s) => s.longestGapMinutes !== null && s.longestGapMinutes >= 180 && s.total >= 10,
    paragraphs: (s) => {
      const gap = formatMinutesAsDuration(s.longestGapMinutes!);
      const range = s.dailyRangeRecent
        ? ` Son ${s.dailyRangeRecent.windowDays} günde en sakin gününde ${s.dailyRangeRecent.min}, en yoğun gününde ${s.dailyRangeRecent.max} sigara işaretlemişsin.`
        : "";
      const avg = s.overallAvgIntervalMinutes
        ? ` Bu, günlük ortalama aralığın (${formatMinutesAsDuration(s.overallAvgIntervalMinutes)}) hayli üzerinde.`
        : "";
      return [
        `Kayıtlarındaki en uzun sigarasız süre ${gap}.${avg}${range}`,
        `En uzun süre boyunca sigarasız kaldığın an ${gap} sürmüş.${avg}${range}`,
      ];
    },
    questions: [
      "O sırada neler farklıydı?",
      "En sakin gününü hatırlıyor musun?",
      "O süre sana nasıl hissettirdi?",
    ],
  },
];

/* ------------------------------------------------------------------ */
/* 4) SEÇİM: tekrar etmeyen anchor + anlatım + soru + söz                */
/* ------------------------------------------------------------------ */

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  return hash;
}

interface Usage {
  count: number;
  last: string;
}

function usageOf(records: ShownRecord[], match: (r: ShownRecord) => boolean): Usage {
  let count = 0;
  let last = "";
  for (const r of records) {
    if (match(r)) {
      count++;
      if (r.date > last) last = r.date;
    }
  }
  return { count, last };
}

function pickLeastUsed<T>(items: T[], usage: (item: T) => Usage, seed: number): T {
  const scored = items.map((item) => ({ item, u: usage(item) }));
  scored.sort(
    (a, b) => a.u.count - b.u.count || (a.u.last < b.u.last ? -1 : a.u.last > b.u.last ? 1 : 0)
  );
  const best = scored[0].u;
  const tied = scored.filter((s) => s.u.count === best.count && s.u.last === best.last);
  return tied[seed % tied.length].item;
}

/** Test ve teşhis amaçlı: uygun anchor'ları döner (aralarında seçim `selectDailyInsight` yapar). */
export function collectEligibleAnchors(smokes: InsightSmoke[], today: string): Anchor[] {
  const signals = computeSignals(smokes, today);
  return ANCHORS.filter((a) => a.eligible(signals));
}

export function selectDailyInsight(
  smokes: InsightSmoke[],
  today: string,
  history: ShownRecord[] = []
): DailyInsight | null {
  const signals = computeSignals(smokes, today);
  const eligible = ANCHORS.filter((a) => a.eligible(signals));
  if (eligible.length === 0) return null;

  const past = history.filter((h) => h.date < today).sort((a, b) => (a.date < b.date ? 1 : -1));
  const lastRec = past[0];
  const seed = hashString(today);

  const pool =
    eligible.length > 1 && lastRec ? eligible.filter((a) => a.id !== lastRec.insightId) : eligible;
  const anchor = pickLeastUsed(pool, (a) => usageOf(past, (r) => r.insightId === a.id), seed);

  const ofThisAnchor = past.filter((r) => r.insightId === anchor.id);
  const lastOfThis = ofThisAnchor[0];

  const paragraphs = anchor.paragraphs(signals);
  const obsIdxAll = paragraphs.map((_, i) => i);
  const obsPool =
    obsIdxAll.length > 1 && lastOfThis ? obsIdxAll.filter((i) => i !== lastOfThis.obsIdx) : obsIdxAll;
  const obsIdx = pickLeastUsed(obsPool, (i) => usageOf(ofThisAnchor, (r) => r.obsIdx === i), seed + 1);

  const qIdxAll = anchor.questions.map((_, i) => i);
  const qPool =
    qIdxAll.length > 1 && lastOfThis ? qIdxAll.filter((i) => i !== lastOfThis.qIdx) : qIdxAll;
  const qIdx = pickLeastUsed(qPool, (i) => usageOf(ofThisAnchor, (r) => r.qIdx === i), seed + 2);

  const matching = QUOTES.filter((q) => q.themes.some((t) => anchor.themes.includes(t)));
  let quotePool = matching.length > 0 ? matching : QUOTES;
  if (quotePool.length > 1 && lastRec) {
    quotePool = quotePool.filter((q) => q.id !== lastRec.quoteId);
  }
  const quote = pickLeastUsed(quotePool, (q) => usageOf(past, (r) => r.quoteId === q.id), seed + 3);

  const comparison = buildComparisonSentence(signals);
  const observation = comparison ? `${paragraphs[obsIdx]} ${comparison}` : paragraphs[obsIdx];

  return {
    date: today,
    insightId: anchor.id,
    obsIdx,
    qIdx,
    quoteId: quote.id,
    observation,
    question: anchor.questions[qIdx],
    quote,
  };
}
