import { describe, it, expect } from "vitest";
import {
  computeSignals,
  collectEligibleAnchors,
  selectDailyInsight,
  type InsightSmoke,
  type ShownRecord,
} from "./insights";
import { QUOTES } from "./quotes";
import { addDaysToDateString } from "./dateUtils";

function mk(dateStr: string, hour: number, reason?: string | null, minute = 0): InsightSmoke {
  const ts = new Date(
    `${dateStr}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+03:00`
  ).getTime();
  return { timestamp: ts, localDate: dateStr, reason: reason ?? null };
}

const d = (n: number) => `2026-09-${String(n).padStart(2, "0")}`;

const BANNED = ["azalt", "bırak", "yapmalısın", "iyi gidiyorsun", "kötü", "başardın"];

/** Birçok sinyali birden tetikleyen zengin bir veri seti (27 gün). */
function richSmokes(): InsightSmoke[] {
  const out: InsightSmoke[] = [];
  for (let i = 1; i <= 27; i++) {
    const date = d(i);
    out.push(mk(date, 8, "aliskanlik"));
    out.push(mk(date, 8, "aliskanlik", 20));
    out.push(mk(date, 12, "keyif"));
    out.push(mk(date, 12, "sosyal", 25));
    out.push(mk(date, 19, "stres"));
    out.push(mk(date, 20, "stres"));
    if (i % 7 < 3) out.push(mk(date, 21, null));
  }
  return out;
}

describe("computeSignals", () => {
  it("veri yokken güvenli varsayılanlar üretir", () => {
    const s = computeSignals([], "2026-09-20");
    expect(s.total).toBe(0);
    expect(s.dominant).toBeNull();
    expect(s.longestGapMinutes).toBeNull();
    expect(s.recentVsPrevious).toBeNull();
  });

  it("baskın sebebi (>=%25, >=3 kayıt) doğru hesaplar", () => {
    const smokes = [1, 2, 3, 4, 5].map((i) => mk(d(i), 10, "stres"));
    const s = computeSignals(smokes, d(5));
    expect(s.dominant?.id).toBe("stres");
    expect(s.dominant?.percent).toBe(100);
  });

  it("bir sebebin gün içi zaman dilimi yoğunluğunu yakalar", () => {
    const smokes = [1, 2, 3, 4, 5].map((i) => mk(d(i), 20, "stres"));
    const s = computeSignals(smokes, d(5));
    const stres = s.reasons.find((r) => r.id === "stres");
    expect(stres?.topDaypart).toBe("akşam");
    expect(stres?.topDaypartPercent).toBe(100);
  });

  it("en uzun boşluğu gece dahil (gerçek) olarak hesaplar", () => {
    // 3 gün, her günde 08:00 ve 14:00 -> gün içi en uzun 6 saat, ama
    // günler arası (14:00 -> ertesi 08:00) 18 saat, bu daha uzun ve gerçek
    // olan bu olmalı (uygulama genelinde kabul edilen ilke).
    const smokes = [1, 2, 3].flatMap((i) => [mk(d(i), 8), mk(d(i), 14)]);
    const s = computeSignals(smokes, d(3));
    expect(s.longestGapMinutes).toBeCloseTo(1080, 0);
  });

  it("son 14 gün / önceki 14 günü karşılaştırır (bugüne göre)", () => {
    const smokes: InsightSmoke[] = [];
    for (let i = 24; i <= 30; i++) for (let k = 0; k < 5; k++) smokes.push(mk(`2026-09-${i}`, 9 + k));
    for (let i = 10; i <= 16; i++) for (let k = 0; k < 2; k++) smokes.push(mk(`2026-09-${String(i).padStart(2, "0")}`, 9 + k));
    const s = computeSignals(smokes, "2026-09-30");
    expect(s.recentVsPrevious).not.toBeNull();
    expect(s.recentVsPrevious!.recentAvg).toBeCloseTo(5, 1);
    expect(s.recentVsPrevious!.previousAvg).toBeCloseTo(2, 1);
  });

  it("fark 1'den küçükse karşılaştırma üretmez", () => {
    const smokes: InsightSmoke[] = [];
    for (let i = 24; i <= 30; i++) for (let k = 0; k < 5; k++) smokes.push(mk(`2026-09-${i}`, 9 + k));
    for (let i = 10; i <= 16; i++) for (let k = 0; k < 5; k++) smokes.push(mk(`2026-09-${String(i).padStart(2, "0")}`, 9 + k));
    const s = computeSignals(smokes, "2026-09-30");
    expect(s.recentVsPrevious).toBeNull();
  });
});

describe("içerik ilkeleri (zengin veri seti)", () => {
  const signals = computeSignals(richSmokes(), d(27));
  const anchors = collectEligibleAnchors(richSmokes(), d(27));

  it("zengin veri setinde birden çok tema uygun hale gelir", () => {
    expect(anchors.length).toBeGreaterThanOrEqual(3);
  });

  it("her temanın ürettiği paragraf birden fazla cümleden oluşur ve sayısal veri içerir", () => {
    for (const a of anchors) {
      for (const p of a.paragraphs(signals)) {
        const sentenceCount = p.split(/[.!]\s+/).filter(Boolean).length;
        expect(sentenceCount).toBeGreaterThanOrEqual(2);
        expect(p).toMatch(/\d/); // en az bir sayı geçmeli (sentez veriye dayanmalı)
      }
    }
  });

  it("hiçbir paragraf ya da soru yönlendirici/yargılayıcı ifade içermiyor", () => {
    for (const a of anchors) {
      for (const p of a.paragraphs(signals)) {
        const t = p.toLowerCase();
        for (const b of BANNED) expect(t).not.toContain(b);
      }
      for (const q of a.questions) {
        expect(q.endsWith("?")).toBe(true);
        const t = q.toLowerCase();
        for (const b of BANNED) expect(t).not.toContain(b);
      }
    }
  });

  it("sözlerin kimlikleri benzersiz, konuları dolu, yönlendirici ifade yok", () => {
    const ids = new Set(QUOTES.map((q) => q.id));
    expect(ids.size).toBe(QUOTES.length);
    for (const q of QUOTES) {
      expect(q.themes.length).toBeGreaterThan(0);
      for (const b of BANNED) expect(q.text.toLowerCase()).not.toContain(b);
    }
  });
});

describe("selectDailyInsight", () => {
  const smokes = richSmokes();

  it("veri yokken null döner", () => {
    expect(selectDailyInsight([], d(20))).toBeNull();
  });

  it("aynı gün ve aynı geçmişle her zaman aynı sonucu verir", () => {
    expect(selectDailyInsight(smokes, d(27), [])).toEqual(selectDailyInsight(smokes, d(27), []));
  });

  it("gözlem, soru ve söz içerir; gözlem birden fazla cümledir", () => {
    const r = selectDailyInsight(smokes, d(27), [])!;
    const sentenceCount = r.observation.split(/[.!]\s+/).filter(Boolean).length;
    expect(sentenceCount).toBeGreaterThanOrEqual(2);
    expect(r.question.endsWith("?")).toBe(true);
    expect(r.quote.text.length).toBeGreaterThan(0);
  });

  it("zaman karşılaştırması eligible ise gözlemin sonuna eklenir", () => {
    const rich: InsightSmoke[] = [];
    for (let i = 1; i <= 14; i++) for (let k = 0; k < 6; k++) rich.push(mk(d(i), 8 + k, "stres"));
    for (let i = 15; i <= 27; i++) for (let k = 0; k < 2; k++) rich.push(mk(d(i), 8 + k, "stres"));
    const r = selectDailyInsight(rich, d(27), [])!;
    expect(r.observation).toContain("14 gün");
  });

  describe("60 günlük simülasyon: tekrara düşmemeli", () => {
    const history: ShownRecord[] = [];
    const days: ReturnType<typeof selectDailyInsight>[] = [];
    for (let i = 0; i < 60; i++) {
      const day = addDaysToDateString("2026-10-01", i);
      const r = selectDailyInsight(smokes, day, history)!;
      days.push(r);
      history.push({
        date: r.date, insightId: r.insightId, obsIdx: r.obsIdx, qIdx: r.qIdx, quoteId: r.quoteId,
      });
    }

    it("her gün bir kart üretilir", () => {
      expect(days.every((x) => x !== null)).toBe(true);
    });

    it("art arda iki günde aynı tema, soru ya da söz görünmez", () => {
      for (let i = 1; i < days.length; i++) {
        expect(days[i]!.insightId).not.toBe(days[i - 1]!.insightId);
        expect(days[i]!.question).not.toBe(days[i - 1]!.question);
        expect(days[i]!.quoteId).not.toBe(days[i - 1]!.quoteId);
      }
    });

    it("sözler yaygın biçimde çeşitlenir (60 günde en az 10 farklı söz)", () => {
      expect(new Set(days.map((x) => x!.quoteId)).size).toBeGreaterThanOrEqual(10);
    });
  });
});
