import { describe, it, expect } from "vitest";
import {
  collectInsights,
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

/** Birçok örüntü türünü birden tetikleyen zengin bir veri seti (30 gün). */
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

describe("collectInsights: temel davranış", () => {
  it("veri yokken hiçbir örüntü üretmez", () => {
    expect(collectInsights([])).toEqual([]);
  });

  it("az veriyle (eşik altı) hiçbir örüntü üretmez", () => {
    expect(collectInsights([mk(d(1), 20, "stres"), mk(d(2), 21, "stres")])).toEqual([]);
  });

  it("bir sebep tek bir gün dilimine yoğunlaşınca yakalar", () => {
    const smokes = [1, 2, 3, 4, 5].map((i) => mk(d(i), 20 + (i % 3), "stres"));
    const found = collectInsights(smokes).find((r) => r.id === "reason-daypart-stres");
    expect(found).toBeDefined();
    expect(found!.observations[0]).toContain("akşam");
  });

  it("dağınık saatlerde daypart örüntüsü üretmez", () => {
    const smokes = [2, 8, 14, 20, 3].map((h, i) => mk(d(i + 1), h, "stres"));
    expect(collectInsights(smokes).find((r) => r.id === "reason-daypart-stres")).toBeUndefined();
  });

  it("hafta sonu yoğunluğunu yakalar", () => {
    // 19-20 Eylül 2026 Cumartesi-Pazar
    const smokes = [
      mk(d(19), 14, "sosyal"), mk(d(19), 16, "sosyal"), mk(d(20), 15, "sosyal"),
      mk(d(13), 14, "sosyal"), mk(d(21), 10, "sosyal"),
    ];
    expect(collectInsights(smokes).find((r) => r.id === "reason-weekend-sosyal")).toBeDefined();
  });

  it("baskın sebebi yakalar", () => {
    const smokes = [
      ...[1, 2, 3, 4, 5].map((i) => mk(d(i), 10, "stres")),
      ...[6, 7, 8, 9, 10].map((i) => mk(d(i), 11, "keyif")),
    ];
    const dom = collectInsights(smokes).find((r) => r.id === "dominant-reason");
    expect(dom).toBeDefined();
    expect(dom!.observations[0].toLowerCase()).toContain("stres");
  });

  it("gün içindeki en uzun sigarasız süreyi yakalar (geceyi saymaz)", () => {
    const smokes = [1, 2, 3, 4, 5].flatMap((i) => [mk(d(i), 8), mk(d(i), 14)]);
    const gap = collectInsights(smokes).find((r) => r.id === "longest-gap");
    expect(gap).toBeDefined();
    expect(gap!.observations[0]).toContain("6s");
  });

  it("gece boyu süren aralar tek başına 'uzun sigarasız süre' üretmez", () => {
    // Her gün 20:00 ve 20:30; geceler arası ~23 saat ama aynı gün içi aralık 30 dk
    const smokes = Array.from({ length: 10 }, (_, i) => [mk(d(i + 1), 20), mk(d(i + 1), 20, null, 30)]).flat();
    expect(collectInsights(smokes).find((r) => r.id === "longest-gap")).toBeUndefined();
  });

  it("sebebe göre 'bir öncekinden sonra' farkını yakalar", () => {
    const smokes = [1, 2, 3, 4, 5, 6].flatMap((i) => [
      mk(d(i), 8, "keyif"),
      mk(d(i), 8, "aliskanlik", 20),
      mk(d(i), 12, "keyif"),
      mk(d(i), 12, "aliskanlik", 20),
      mk(d(i), 18, "stres"),
    ]);
    const ids = collectInsights(smokes).map((r) => r.id);
    expect(ids).toContain("interval-short-aliskanlik");
    expect(ids).toContain("interval-long-stres");
  });

  it("son 14 gün ile önceki 14 günü karşılaştırır (bugüne göre)", () => {
    const smokes: InsightSmoke[] = [];
    for (let i = 24; i <= 30; i++) for (let k = 0; k < 5; k++) smokes.push(mk(`2026-09-${i}`, 9 + k));
    for (let i = 10; i <= 16; i++) for (let k = 0; k < 2; k++) smokes.push(mk(`2026-09-${String(i).padStart(2, "0")}`, 9 + k));
    const r = collectInsights(smokes, "2026-09-30").find((x) => x.id === "recent-vs-previous");
    expect(r).toBeDefined();
    expect(r!.observations[0]).toContain("5.0");
    expect(r!.observations[0]).toContain("2.0");
  });

  it("nedeni belirtilmemiş sigara oranı yüksekse yakalar", () => {
    const smokes = Array.from({ length: 10 }, (_, i) => mk(d(i + 1), 10 + (i % 3), i % 2 === 0 ? "stres" : null));
    expect(collectInsights(smokes).find((r) => r.id === "unspecified-reasons")).toBeDefined();
  });
});

describe("içerik ilkeleri", () => {
  const candidates = collectInsights(richSmokes(), d(27));

  it("zengin veri setinde çok sayıda farklı örüntü türü üretilir", () => {
    expect(candidates.length).toBeGreaterThanOrEqual(10);
  });

  it("her örüntünün birden çok soru ve anlatım biçimi var", () => {
    for (const c of candidates) {
      expect(c.questions.length).toBeGreaterThanOrEqual(4);
      expect(c.observations.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("hiçbir gözlem ya da soru yönlendirici/yargılayıcı ifade içermiyor", () => {
    for (const c of candidates) {
      for (const o of c.observations) {
        expect(o.charAt(0)).toBe(o.charAt(0).toLocaleUpperCase("tr")); // cümle büyük harfle başlar
        expect(o.endsWith(".")).toBe(true);
        expect(o).not.toContain("?");
        for (const b of BANNED) expect(o.toLowerCase()).not.toContain(b);
      }
      for (const q of c.questions) {
        expect(q.endsWith("?")).toBe(true);
        expect(q.toLowerCase()).not.toContain("tanıdık geliyor mu");
        for (const b of BANNED) expect(q.toLowerCase()).not.toContain(b);
      }
    }
  });

  it("hiçbir söz yönlendirici ifade içermiyor, kimlikleri benzersiz, konuları dolu", () => {
    const ids = new Set(QUOTES.map((q) => q.id));
    expect(ids.size).toBe(QUOTES.length);
    for (const q of QUOTES) {
      expect(q.themes.length).toBeGreaterThan(0);
      expect(q.author.length).toBeGreaterThan(0);
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
    expect(selectDailyInsight(smokes, d(28), [])).toEqual(selectDailyInsight(smokes, d(28), []));
  });

  it("gözlem, soru ve söz içerir", () => {
    const r = selectDailyInsight(smokes, d(28), [])!;
    expect(r.observation.length).toBeGreaterThan(0);
    expect(r.question.endsWith("?")).toBe(true);
    expect(r.quote.text.length).toBeGreaterThan(0);
    expect(r.quote.author.length).toBeGreaterThan(0);
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

    it("art arda iki günde aynı örüntü, gözlem, soru ya da söz görünmez", () => {
      for (let i = 1; i < days.length; i++) {
        expect(days[i]!.insightId).not.toBe(days[i - 1]!.insightId);
        expect(days[i]!.observation).not.toBe(days[i - 1]!.observation);
        expect(days[i]!.question).not.toBe(days[i - 1]!.question);
        expect(days[i]!.quoteId).not.toBe(days[i - 1]!.quoteId);
      }
    });

    it("ilk 10 günün hepsi farklı örüntüdür (havuz tükenmeden tekrar yok)", () => {
      const first = days.slice(0, 10).map((x) => x!.insightId);
      expect(new Set(first).size).toBe(10);
    });

    it("her örüntü için, tüm soruları bitmeden bir soru tekrar edilmez", () => {
      const byInsight = new Map<string, string[]>();
      for (const x of days) {
        const arr = byInsight.get(x!.insightId) ?? [];
        arr.push(x!.question);
        byInsight.set(x!.insightId, arr);
      }
      const pool = new Map(collectInsights(smokes, "2026-10-01").map((c) => [c.id, c.questions.length]));
      for (const [id, qs] of byInsight) {
        const n = Math.min(qs.length, pool.get(id) ?? qs.length);
        expect(new Set(qs.slice(0, n)).size).toBe(n);
      }
    });

    it("sözler yaygın biçimde çeşitlenir (60 günde en az 15 farklı söz)", () => {
      expect(new Set(days.map((x) => x!.quoteId)).size).toBeGreaterThanOrEqual(15);
    });

    it("hiçbir söz art arda 3 gün içinde tekrar etmez", () => {
      for (let i = 0; i < days.length; i++) {
        for (let j = i + 1; j <= Math.min(i + 3, days.length - 1); j++) {
          expect(days[j]!.quoteId).not.toBe(days[i]!.quoteId);
        }
      }
    });
  });
});
