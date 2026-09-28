import { SMOKE_REASONS, getReasonDef } from "./reasons";
import {
  getLocalHour,
  isLocalWeekend,
  toLocalWeekdayName,
  addDaysToDateString,
} from "./dateUtils";
import { formatMinutesAsDuration } from "./allowance";
import { QUOTES, type Quote } from "./quotes";

/**
 * YORUMLAR — TASARIM İLKESİ
 * --------------------------
 * Bu motor, kullanıcının kendi verisinde bir örüntü bulup üç parçalı bir kart
 * üretir: (1) nötr, düz bir GÖZLEM, (2) kişiyi kendi içine bakmaya çağıran kısa,
 * açık uçlu bir SORU, (3) konuyla ilgili, kaynağı doğrulanabilir bir SÖZ.
 * Asla "azaltmalısın", "iyi gidiyorsun" gibi bir yön/değer yargısı içermez.
 *
 * TEKRAR ETMEME: Her gün gösterilen kart (`ShownRecord`) kaydedilir. Ertesi gün
 * örüntü, gözlem biçimi, soru ve söz; en az kullanılandan başlayarak, dünkünü
 * hariç tutarak seçilir. Böylece aynı şey art arda görünmez, havuz tükenmeden
 * de tekrar etmez.
 */

export interface InsightSmoke {
  timestamp: number;
  localDate: string;
  reason?: string | null;
}

/** Bir örüntü adayı: gözlem anlatım biçimleri + sorular + söz konuları. */
export interface Insight {
  id: string;
  observations: string[];
  questions: string[];
  themes: string[];
}

/** Hangi gün neyin gösterildiğinin kaydı (tekrarı önlemek için saklanır). */
export interface ShownRecord {
  date: string;
  insightId: string;
  obsIdx: number;
  qIdx: number;
  quoteId: string;
}

/** O gün gösterilecek nihai kart. */
export interface DailyInsight extends ShownRecord {
  observation: string;
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

const MIN_FOR_REASON_PATTERN = 5;
const MIN_TOTAL = 10;
const MIN_FOR_WEEKDAY_CLUSTER = 14;
const MIN_DAYS_FOR_FIRST_SMOKE = 7;

function pct(part: number, total: number): number {
  return Math.round((part * 100) / total);
}

/** Cümle başı için ilk harfi (Türkçe kurallarıyla) büyütür: "öğleden sonra" -> "Öğleden sonra". */
function cap(text: string): string {
  return text.charAt(0).toLocaleUpperCase("tr") + text.slice(1);
}

function hh(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
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

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Kullanıcının verisinde tespit edilebilecek tüm uygun (eşiği geçmiş) örüntüleri toplar. */
export function collectInsights(smokes: InsightSmoke[], today?: string): Insight[] {
  const insights: Insight[] = [];
  const total = smokes.length;
  if (total === 0) return insights;

  const latestDate = smokes.reduce((m, s) => (s.localDate > m ? s.localDate : m), "");
  const ref = today ?? latestDate;

  const dailyCounts = new Map<string, number>();
  for (const s of smokes) {
    dailyCounts.set(s.localDate, (dailyCounts.get(s.localDate) ?? 0) + 1);
  }

  // 1) Sebep × gün içi zaman dilimi
  for (const reason of SMOKE_REASONS) {
    const list = smokes.filter((s) => s.reason === reason.id);
    if (list.length < MIN_FOR_REASON_PATTERN) continue;

    const buckets: Record<Daypart, number> = { gece: 0, sabah: 0, "öğleden sonra": 0, akşam: 0 };
    for (const s of list) buckets[daypartOf(getLocalHour(s.timestamp))]++;
    const [topBucket, topCount] = (Object.entries(buckets) as [Daypart, number][]).sort(
      (a, b) => b[1] - a[1]
    )[0];

    if (topCount / list.length >= 0.6) {
      const p = pct(topCount, list.length);
      insights.push({
        id: `reason-daypart-${reason.id}`,
        themes: [reason.id, "ritim", "sebep", "farkindalik"],
        observations: [
          `${reason.label} kaynaklı sigaraların çoğu ${topBucket} saatlerinde.`,
          `${reason.label} olarak işaretlediğin anlar en çok ${topBucket} saatlerinde toplanıyor.`,
          `${cap(topBucket)} saatleri, ${reason.label} kaynaklı sigaraların en yoğun olduğu zaman dilimi (%${p}).`,
        ],
        questions: [
          "O saatlerde günün içinde neler oluyor?",
          "O anlarda sigara sana ne veriyor gibi hissediyorsun?",
          "O saatlerde sana ne iyi gelirdi?",
          "O saatlere gelmeden hemen önce neler yaşıyorsun?",
          "O zaman dilimini diğerlerinden ayıran ne?",
          "O anlarda bedeninde ne hissediyorsun?",
        ],
      });
    }
  }

  // 2) Sebep × hafta sonu yoğunluğu
  for (const reason of SMOKE_REASONS) {
    const list = smokes.filter((s) => s.reason === reason.id);
    if (list.length < MIN_FOR_REASON_PATTERN) continue;
    const weekend = list.filter((s) => isLocalWeekend(s.timestamp)).length;
    if (weekend / list.length >= 0.5) {
      insights.push({
        id: `reason-weekend-${reason.id}`,
        themes: [reason.id, "ritim", "sebep"],
        observations: [
          `${reason.label} kaynaklı sigaraların büyük kısmı hafta sonlarına denk geliyor.`,
          `Hafta sonları, ${reason.label} kaynaklı sigaraların daha sık işaretlendiği günler.`,
          `Hafta sonuna düşen ${reason.label} kaynaklı sigara oranı %${pct(weekend, list.length)}.`,
        ],
        questions: [
          "Hafta sonlarını hafta içinden ayıran ne?",
          "O günlerde kimlerle, nerede oluyorsun?",
          "O günler sana nasıl hissettiriyor?",
          "O günlerin temposu içinde sigara nerede duruyor?",
          "O günlerde zamanı nasıl geçiriyorsun?",
        ],
      });
    }
  }

  // 3) En baskın sebep
  if (total >= MIN_TOTAL) {
    const counts = new Map<string, number>();
    for (const s of smokes) if (s.reason) counts.set(s.reason, (counts.get(s.reason) ?? 0) + 1);
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0 && sorted[0][1] / total >= 0.4) {
      const def = getReasonDef(sorted[0][0]);
      insights.push({
        id: "dominant-reason",
        themes: [def.id, "sebep", "kendini-bil"],
        observations: [
          `En sık işaretlediğin neden "${def.label}".`,
          `Sigaraların yaklaşık %${pct(sorted[0][1], total)} oranında "${def.label}" işaretlenmiş.`,
          `"${def.label}", senin için en sık tekrar eden neden.`,
        ],
        questions: [
          "Bunun altında ne yatıyor olabilir?",
          "Bu neden hayatının başka hangi yerlerinde karşına çıkıyor?",
          "Bu ihtiyaca başka neler cevap verebilir?",
          "Bu durum ilk ne zaman başladı?",
          "Bu nedenle baş başa kaldığında ilk ne hissediyorsun?",
          "Bu duygu ya da durum sana ne anlatmaya çalışıyor?",
        ],
      });
    }
  }

  // 4) Haftanın belirli bir gününde kümelenme
  if (total >= MIN_FOR_WEEKDAY_CLUSTER) {
    const dayCounts = new Map<string, number>();
    for (const s of smokes) {
      const day = toLocalWeekdayName(s.timestamp);
      dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
    }
    const avg = total / dayCounts.size;
    const [topDay, topCount] = [...dayCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topCount >= avg * 1.5 && topCount >= 5) {
      insights.push({
        id: "weekday-cluster",
        themes: ["ritim", "zaman", "farkindalik"],
        observations: [
          `Sigaraların ${topDay} günlerinde daha sık kümelenmiş görünüyor.`,
          `${topDay} günleri, kayıtlarının en yoğun olduğu gün.`,
          `Haftanın en yoğun günü ${topDay} çıkıyor.`,
        ],
        questions: [
          "O günü diğer günlerden ayıran ne?",
          "O günün akışında neler var?",
          "O gün içinden neler geçiyor?",
          "O günün sabahı nasıl başlıyor?",
          "O gün kimlerle ve nerede oluyorsun?",
        ],
      });
    }
  }

  // 5) Günün ilk sigarasının zamanlaması
  {
    const earliest = new Map<string, number>();
    for (const s of smokes) {
      const cur = earliest.get(s.localDate);
      if (cur === undefined || s.timestamp < cur) earliest.set(s.localDate, s.timestamp);
    }
    if (earliest.size >= MIN_DAYS_FOR_FIRST_SMOKE) {
      const avgHour = Math.round(mean([...earliest.values()].map((ts) => getLocalHour(ts))));
      if (avgHour <= 9) {
        insights.push({
          id: "first-smoke-early",
          themes: ["baslangic", "aliskanlik", "farkindalik"],
          observations: [
            `Günün ilk sigarası genelde saat ${avgHour}:00 civarında oluyor.`,
            `Sabahın ilk sigarası ortalama saat ${avgHour}:00 sularında geliyor.`,
            `Güne başladıktan sonra ilk sigara çoğunlukla ${avgHour}:00 civarında.`,
          ],
          questions: [
            "Güne başlarken o anda ne arıyorsun?",
            "Uyandığında ilk hissettiğin şey ne oluyor?",
            "Sabahın o anında sigara sana ne sağlıyor?",
            "Güne başlamadan önceki dakikalarda neler geçiyor içinden?",
            "O ilk anı başka ne doldurabilirdi?",
          ],
        });
      }
    }
  }

  // 6) Sebebe göre "bir öncekinden ne kadar sonra" (aynı gün içinde)
  const intervals = withinDayIntervals(smokes);
  if (intervals.length >= 8) {
    const overall = mean(intervals.map((i) => i.minutes));
    if (overall > 0) {
      for (const reason of SMOKE_REASONS) {
        const own = intervals.filter((i) => i.reason === reason.id).map((i) => i.minutes);
        if (own.length < MIN_FOR_REASON_PATTERN) continue;
        const diff = (mean(own) - overall) / overall;
        if (diff <= -0.3) {
          insights.push({
            id: `interval-short-${reason.id}`,
            themes: [reason.id, "duygu", "sukunet"],
            observations: [
              `${reason.label} kaynaklı sigaralar, bir öncekinden genel ortalamana göre belirgin şekilde daha kısa süre sonra geliyor.`,
              `${reason.label} olarak işaretlediğin sigaralarda, bir önceki sigarayla arandaki süre ortalamanın belirgin altında.`,
            ],
            questions: [
              "O anlarda içinde neler hızlanıyor?",
              "Hızlanan şey bir ihtiyaç mı, bir alışkanlık mı?",
              "O durumlar seni nasıl bir hâle getiriyor?",
              "Bu kadar kısa sürede yeniden neyi arıyorsun?",
              "O anlarda araya giren şey ne?",
            ],
          });
        } else if (diff >= 0.3) {
          insights.push({
            id: `interval-long-${reason.id}`,
            themes: [reason.id, "sukunet", "degisim"],
            observations: [
              `${reason.label} kaynaklı sigaralar, bir öncekinden genel ortalamana göre belirgin şekilde daha uzun süre sonra geliyor.`,
              `${reason.label} olarak işaretlediğin sigaralarda, bir önceki sigarayla arandaki süre ortalamanın belirgin üstünde.`,
            ],
            questions: [
              "O anlarda seni ne sakin tutuyor?",
              "O durumlarda sigarasız geçen zamanı mümkün kılan ne?",
              "Orada işleyen bir şey varsa, o ne olabilir?",
              "O anlarda içindeki hâl nasıl?",
              "Bu uzun aralar sana ne hissettiriyor?",
            ],
          });
        }
      }
    }
  }

  // 7) Gün içindeki en uzun sigarasız süre
  if (total >= MIN_TOTAL && intervals.length > 0) {
    const longest = Math.max(...intervals.map((i) => i.minutes));
    if (longest >= 240) {
      const dur = formatMinutesAsDuration(longest);
      insights.push({
        id: "longest-gap",
        themes: ["sukunet", "zaman", "degisim"],
        observations: [
          `Aynı gün içindeki en uzun sigarasız süren ${dur} sürmüş.`,
          `Kayıtlarına göre gün içinde en uzun kesintisiz sigarasız aralığın ${dur}.`,
        ],
        questions: [
          "O sırada neler farklıydı?",
          "O saatlerde ne yapıyordun, kiminleydin?",
          "O süre sana nasıl hissettirdi?",
          "O sürenin nasıl geçtiğini hatırlıyor musun?",
          "O saatlerde zihnin nerelerdeydi?",
        ],
      });
    }
  }

  // 8) En yoğun saat
  if (total >= MIN_TOTAL) {
    const hourCounts = new Map<number, number>();
    for (const s of smokes) {
      const h = getLocalHour(s.timestamp);
      hourCounts.set(h, (hourCounts.get(h) ?? 0) + 1);
    }
    const [topHour, topCount] = [...hourCounts.entries()].sort(
      (a, b) => b[1] - a[1] || a[0] - b[0]
    )[0];
    if (topCount >= Math.max(3, total * 0.15)) {
      insights.push({
        id: "busiest-hour",
        themes: ["ritim", "zaman", "aliskanlik"],
        observations: [
          `En çok sigara saat ${hh(topHour)} ile ${hh((topHour + 1) % 24)} arasında işaretleniyor.`,
          `Günün en yoğun saati ${hh(topHour)} civarı.`,
          `Sigaraların %${pct(topCount, total)} kadarı ${hh(topHour)} ile ${hh((topHour + 1) % 24)} arasına denk geliyor.`,
        ],
        questions: [
          "O saat civarında rutinin nasıl?",
          "O saatten hemen önce neler oluyor?",
          "O saat senin için ne anlama geliyor?",
          "O saat dilimi sana neyi hatırlatıyor?",
          "O saatte başka bir şey yapabilseydin, ne olurdu?",
        ],
      });
    }
  }

  // 9) Hafta sonu ile hafta içi günlük ortalama
  {
    const dayInfo = new Map<string, { count: number; weekend: boolean }>();
    for (const s of smokes) {
      const cur = dayInfo.get(s.localDate);
      if (cur) cur.count++;
      else dayInfo.set(s.localDate, { count: 1, weekend: isLocalWeekend(s.timestamp) });
    }
    const we = [...dayInfo.values()].filter((d) => d.weekend).map((d) => d.count);
    const wd = [...dayInfo.values()].filter((d) => !d.weekend).map((d) => d.count);
    if (we.length >= 3 && wd.length >= 5) {
      const a = mean(we);
      const b = mean(wd);
      if (Math.abs(a - b) / Math.max(a, b) >= 0.25) {
        insights.push({
          id: "weekend-vs-weekday",
          themes: ["ritim", "degisim", "farkindalik"],
          observations: [
            `Hafta sonu günlerinde günlük ortalaman ${a.toFixed(1)}, hafta içinde ${b.toFixed(1)}.`,
            `Günlük ortalaman hafta sonlarında ${a.toFixed(1)}, hafta içi günlerde ${b.toFixed(1)}.`,
          ],
          questions: [
            "Hafta sonu ile hafta içi arasındaki en büyük fark ne?",
            "Bu iki tür günde kendini nasıl hissediyorsun?",
            "Günlerin yapısı bu farkı açıklıyor mu?",
            "Hangi tür günü daha çok seviyorsun, neden?",
            "Bu farkın arkasında ne olabilir?",
          ],
        });
      }
    }
  }

  // 10) Son iki hafta ile bir önceki iki hafta
  {
    const startRecent = addDaysToDateString(ref, -13);
    const startPrev = addDaysToDateString(ref, -27);
    const recent: number[] = [];
    const prev: number[] = [];
    for (const [date, count] of dailyCounts) {
      if (date >= startRecent && date <= ref) recent.push(count);
      else if (date >= startPrev && date < startRecent) prev.push(count);
    }
    if (recent.length >= 5 && prev.length >= 5) {
      const a = mean(recent);
      const b = mean(prev);
      if (Math.abs(a - b) >= 1) {
        insights.push({
          id: "recent-vs-previous",
          themes: ["degisim", "zaman", "geriye-bakis"],
          observations: [
            `Son 14 günde günlük ortalaman ${a.toFixed(1)}, ondan önceki 14 günde ${b.toFixed(1)}.`,
            `Son iki haftanın günlük ortalaması ${a.toFixed(1)}; bir önceki iki haftanınki ${b.toFixed(1)}.`,
          ],
          questions: [
            "İki dönem arasında hayatında neler değişti?",
            "Bu iki dönemi birbirinden ayıran ne?",
            "Son zamanlarda seni en çok ne meşgul etti?",
            "Bu değişimi sen fark ediyor muydun?",
            "Bu iki dönemde ruh halin nasıldı?",
            "Bu sayılar sana ne söylüyor?",
          ],
        });
      }
    }
  }

  // 11) Son iki haftadaki günlük değişkenlik
  {
    const start = addDaysToDateString(ref, -13);
    const counts = [...dailyCounts.entries()]
      .filter(([d]) => d >= start && d <= ref)
      .map(([, c]) => c);
    if (counts.length >= 7) {
      const min = Math.min(...counts);
      const max = Math.max(...counts);
      if (max - min >= 3) {
        insights.push({
          id: "range-recent",
          themes: ["farkindalik", "degisim", "zaman"],
          observations: [
            `Son 14 günde günlük sayın ${min} ile ${max} arasında değişmiş.`,
            `Son iki haftada en sakin gününde ${min}, en yoğun gününde ${max} sigara işaretlemişsin.`,
          ],
          questions: [
            "En yoğun günlerinde neler farklıydı?",
            "En sakin günlerin nasıl geçti?",
            "Günden güne değişen şey ne?",
            "En sakin gününü hatırlıyor musun?",
            "Sayının değiştiği günlerde ortak bir şey var mı?",
          ],
        });
      }
    }
  }

  // 12) Nedeni işaretlenmemiş sigaralar
  if (total >= MIN_TOTAL) {
    const known = new Set(SMOKE_REASONS.map((r) => r.id));
    const unspecified = smokes.filter((s) => !s.reason || !known.has(s.reason)).length;
    if (unspecified / total >= 0.3) {
      const p = pct(unspecified, total);
      insights.push({
        id: "unspecified-reasons",
        themes: ["farkindalik", "kendini-bil", "sebep"],
        observations: [
          `Sigaraların yaklaşık %${p} kadarında bir neden işaretlenmemiş.`,
          `Kayıtlarının %${p} kadarı "Belirtilmedi" olarak duruyor.`,
        ],
        questions: [
          "Neden işaretlemediğin anlarda neler oluyor?",
          "Sebebi boş bıraktığında ne hissediyorsun?",
          "Bazı anları adlandırmak neden zor geliyor?",
          "Otomatik yaptığını hissettiğin anlar hangileri?",
          "O anlarda dikkatin nerede?",
        ],
      });
    }
  }

  // 13) Gün içi ortalama aralık
  if (intervals.length >= 8) {
    const dur = formatMinutesAsDuration(mean(intervals.map((i) => i.minutes)));
    insights.push({
      id: "avg-interval",
      themes: ["zaman", "sukunet", "ritim"],
      observations: [
        `Aynı gün içinde sigaralar arasında ortalama ${dur} geçiyor.`,
        `Gün içindeki sigaralar arasındaki ortalama aralık ${dur}.`,
      ],
      questions: [
        "Bu süre sana kısa mı, uzun mu geliyor?",
        "Bu aralığı ne belirliyor?",
        "Aralıklar günün hangi bölümünde kısalıyor?",
        "Aradaki süre boyunca zihnin nerede?",
        "Bu aralıklarda seni ne oyalıyor?",
      ],
    });
  }

  // 14) Neden çeşitliliği
  if (total >= MIN_TOTAL) {
    const known = new Set(SMOKE_REASONS.map((r) => r.id));
    const used = new Set(smokes.map((s) => s.reason).filter((r): r is string => !!r && known.has(r)));
    const tagged = smokes.filter((s) => s.reason && known.has(s.reason)).length;
    if (tagged >= MIN_TOTAL && used.size >= 3) {
      insights.push({
        id: "reason-diversity",
        themes: ["kendini-bil", "sebep", "farkindalik"],
        observations: [
          `Kayıtlarında ${used.size} farklı neden işaretlemişsin.`,
          `Sigaralarının arkasında ${used.size} farklı neden görünüyor.`,
        ],
        questions: [
          "Bu nedenlerin ortak bir yanı var mı?",
          "Hangisi seni en çok yoruyor?",
          "Bu nedenler birbirini nasıl tetikliyor?",
          "Hangi neden sana en yabancı geliyor?",
          "Bu nedenlerden hangisini en kolay fark ediyorsun?",
        ],
      });
    }
  }

  // 15) Genel olarak en yoğun zaman dilimi
  if (total >= MIN_TOTAL) {
    const buckets: Record<Daypart, number> = { gece: 0, sabah: 0, "öğleden sonra": 0, akşam: 0 };
    for (const s of smokes) buckets[daypartOf(getLocalHour(s.timestamp))]++;
    const [top, count] = (Object.entries(buckets) as [Daypart, number][]).sort(
      (a, b) => b[1] - a[1]
    )[0];
    if (count / total >= 0.4) {
      insights.push({
        id: "daypart-overall",
        themes: ["ritim", "zaman", "aliskanlik"],
        observations: [
          `Sigaraların %${pct(count, total)} kadarı ${top} saatlerinde.`,
          `Günün ${top} bölümü, kayıtlarının en yoğun olduğu kısım.`,
        ],
        questions: [
          "O zaman diliminde günün temposu nasıl?",
          "Günün geri kalanından farkı ne?",
          "O saatlerde çevrende neler var?",
          "O saatlerde kiminle, nerede oluyorsun?",
          "O bölümde seni en çok ne yoruyor?",
        ],
      });
    }
  }

  return insights;
}

/** "YYYY-MM-DD" -> 1970'ten beri geçen gün sayısı (ardışık günler ardışık sayılar verir). */
function dayNumber(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

interface Usage {
  count: number;
  last: string; // en son kullanıldığı tarih ("" = hiç kullanılmadı)
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

/** En az kullanılanı, eşitlikte en eski kullanılanı seçer; kalan eşitlik gün numarasıyla döndürülür. */
function pickLeastUsed<T>(items: T[], usage: (item: T) => Usage, seed: number): T {
  const scored = items.map((item) => ({ item, u: usage(item) }));
  scored.sort(
    (a, b) => a.u.count - b.u.count || (a.u.last < b.u.last ? -1 : a.u.last > b.u.last ? 1 : 0)
  );
  const best = scored[0].u;
  const tied = scored.filter((s) => s.u.count === best.count && s.u.last === best.last);
  return tied[seed % tied.length].item;
}

/**
 * O gün için gösterilecek kartı seçer. `history`, daha önce gösterilenlerin
 * kaydıdır; boşsa seçim yalnızca tarihe göre deterministiktir.
 */
export function selectDailyInsight(
  smokes: InsightSmoke[],
  today: string,
  history: ShownRecord[] = []
): DailyInsight | null {
  const candidates = collectInsights(smokes, today).sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  );
  if (candidates.length === 0) return null;

  const past = history.filter((h) => h.date < today).sort((a, b) => (a.date < b.date ? 1 : -1));
  const lastRec = past[0];
  const seed = dayNumber(today);

  // 1) Örüntü: dünkünü (mümkünse) hariç tut, en az gösterileni seç
  const insightPool =
    candidates.length > 1 && lastRec
      ? candidates.filter((c) => c.id !== lastRec.insightId)
      : candidates;
  const insight = pickLeastUsed(
    insightPool,
    (c) => usageOf(past, (r) => r.insightId === c.id),
    seed
  );

  const ofThisInsight = past.filter((r) => r.insightId === insight.id);
  const lastOfThis = ofThisInsight[0];

  // 2) Gözlem anlatım biçimi
  const obsIdxAll = insight.observations.map((_, i) => i);
  const obsPool =
    obsIdxAll.length > 1 && lastOfThis ? obsIdxAll.filter((i) => i !== lastOfThis.obsIdx) : obsIdxAll;
  const obsIdx = pickLeastUsed(obsPool, (i) => usageOf(ofThisInsight, (r) => r.obsIdx === i), seed + 1);

  // 3) Soru
  const qIdxAll = insight.questions.map((_, i) => i);
  const qPool =
    qIdxAll.length > 1 && lastOfThis ? qIdxAll.filter((i) => i !== lastOfThis.qIdx) : qIdxAll;
  const qIdx = pickLeastUsed(qPool, (i) => usageOf(ofThisInsight, (r) => r.qIdx === i), seed + 2);

  // 4) Söz: konuyla eşleşenlerden, dünkünü hariç tutarak en az gösterileni
  const matching = QUOTES.filter((q) => q.themes.some((t) => insight.themes.includes(t)));
  let quotePool = matching.length > 0 ? matching : QUOTES;
  if (quotePool.length > 1 && lastRec) {
    quotePool = quotePool.filter((q) => q.id !== lastRec.quoteId);
  }
  const quote = pickLeastUsed(quotePool, (q) => usageOf(past, (r) => r.quoteId === q.id), seed + 3);

  return {
    date: today,
    insightId: insight.id,
    obsIdx,
    qIdx,
    quoteId: quote.id,
    observation: insight.observations[obsIdx],
    question: insight.questions[qIdx],
    quote,
  };
}
