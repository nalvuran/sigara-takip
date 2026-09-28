import { describe, it, expect } from "vitest";
import { collectInsights, selectDailyInsight, type InsightSmoke } from "./insights";

function mk(dateStr: string, hour: number, reason?: string): InsightSmoke {
  // dateStr: "YYYY-MM-DD", saat Türkiye saatiyle (+03:00)
  const timestamp = new Date(`${dateStr}T${String(hour).padStart(2, "0")}:00:00+03:00`).getTime();
  return {
    timestamp,
    localDate: dateStr,
    reason: reason ?? null,
  };
}

describe("collectInsights", () => {
  it("veri yokken hiçbir yorum üretmez", () => {
    expect(collectInsights([])).toEqual([]);
  });

  it("az veriyle (eşik altı) hiçbir yorum üretmez", () => {
    const smokes = [mk("2026-09-01", 20, "stres"), mk("2026-09-02", 21, "stres")];
    expect(collectInsights(smokes)).toEqual([]);
  });

  it("bir sebep belirgin şekilde tek bir gün dilimine yoğunlaşınca yakalar", () => {
    const smokes = [
      mk("2026-09-01", 20, "stres"),
      mk("2026-09-02", 21, "stres"),
      mk("2026-09-03", 22, "stres"),
      mk("2026-09-04", 19, "stres"),
      mk("2026-09-05", 20, "stres"),
    ];
    const result = collectInsights(smokes);
    const found = result.find((r) => r.id === "reason-daypart-stres");
    expect(found).toBeDefined();
    expect(found!.observation).toContain("akşam");
    expect(found!.observation).not.toContain("?");
    expect(found!.questions.length).toBeGreaterThan(0);
  });

  it("dağınık saatlerde (belirgin çoğunluk yokken) daypart yorumu üretmez", () => {
    const smokes = [
      mk("2026-09-01", 2, "stres"),
      mk("2026-09-02", 8, "stres"),
      mk("2026-09-03", 14, "stres"),
      mk("2026-09-04", 20, "stres"),
      mk("2026-09-05", 3, "stres"),
    ];
    const result = collectInsights(smokes);
    expect(result.find((r) => r.id === "reason-daypart-stres")).toBeUndefined();
  });

  it("hafta sonu yoğunluğunu yakalar", () => {
    // 2026-09-19 Cumartesi, 2026-09-20 Pazar
    const smokes = [
      mk("2026-09-19", 14, "sosyal"),
      mk("2026-09-19", 16, "sosyal"),
      mk("2026-09-20", 15, "sosyal"),
      mk("2026-09-13", 14, "sosyal"), // önceki pazar
      mk("2026-09-21", 10, "sosyal"), // pazartesi (hafta içi)
    ];
    const result = collectInsights(smokes);
    expect(result.find((r) => r.id === "reason-weekend-sosyal")).toBeDefined();
  });

  it("baskın sebebi (>=%40, toplam>=10) yakalar", () => {
    const smokes = [
      ...Array.from({ length: 5 }, (_, i) => mk(`2026-09-0${i + 1}`, 10, "stres")),
      ...Array.from({ length: 5 }, (_, i) => mk(`2026-09-1${i}`, 11, "keyif")),
    ];
    const result = collectInsights(smokes);
    const dominant = result.find((r) => r.id === "dominant-reason");
    expect(dominant).toBeDefined();
    expect(dominant!.observation.toLowerCase()).toContain("stres");
  });

  it("en uzun sigarasız süreyi (>=6 saat, >=10 kayıt) yakalar", () => {
    const smokes = Array.from({ length: 10 }, (_, i) =>
      mk(`2026-09-${String(i + 1).padStart(2, "0")}`, 10)
    );
    // Günler arası zaten ~24 saatlik boşluklar var; ekstra bir kayıt ekleyelim
    smokes.push(mk("2026-09-11", 18));
    const result = collectInsights(smokes);
    const gap = result.find((r) => r.id === "longest-gap");
    expect(gap).toBeDefined();
    expect(gap!.observation).toContain("sigarasız süren");
  });

  it("hiçbir gözlem/soru yönlendirici ya da yargılayıcı ifade içermiyor (tasarım ilkesi)", () => {
    // Birden çok örüntü türünü tetikleyecek zengin bir veri seti
    const smokes = [
      ...Array.from({ length: 6 }, (_, i) => mk(`2026-09-0${i + 1}`, 20, "stres")),
      ...Array.from({ length: 6 }, (_, i) => mk(`2026-09-1${i}`, 7, "aliskanlik")),
    ];
    const result = collectInsights(smokes);
    expect(result.length).toBeGreaterThan(0);
    const banned = ["azalt", "bırak", "yapmalısın", "iyi gidiyorsun", "kötü", "başardın"];
    for (const insight of result) {
      const obs = insight.observation.toLowerCase();
      expect(obs.endsWith(".")).toBe(true);
      expect(obs).not.toContain("?");
      for (const b of banned) expect(obs).not.toContain(b);
      expect(insight.questions.length).toBeGreaterThanOrEqual(2);
      for (const q of insight.questions) {
        expect(q.endsWith("?")).toBe(true);
        const t = q.toLowerCase();
        for (const b of banned) expect(t).not.toContain(b);
        // Evet/hayır kalıbına düşmesin
        expect(t).not.toContain("tanıdık geliyor mu");
      }
    }
  });
});

describe("selectDailyInsight", () => {
  const smokes = [
    mk("2026-09-01", 20, "stres"),
    mk("2026-09-02", 21, "stres"),
    mk("2026-09-03", 22, "stres"),
    mk("2026-09-04", 19, "stres"),
    mk("2026-09-05", 20, "stres"),
  ];

  it("veri yokken null döner", () => {
    expect(selectDailyInsight([], "2026-09-20")).toBeNull();
  });

  it("aynı gün ve aynı veriyle her zaman aynı sonucu döner (deterministik)", () => {
    const a = selectDailyInsight(smokes, "2026-09-20");
    const b = selectDailyInsight(smokes, "2026-09-20");
    expect(a).toEqual(b);
  });

  it("tek aday varken hangi gün olursa olsun aynı gözlemi döner", () => {
    const a = selectDailyInsight(smokes, "2026-09-20");
    const b = selectDailyInsight(smokes, "2026-09-21");
    expect(a!.id).toBe(b!.id);
    expect(a!.observation).toBe(b!.observation);
  });

  it("sonuç bir gözlem ve tek bir soru içerir; soru ? ile biter", () => {
    const r = selectDailyInsight(smokes, "2026-09-20")!;
    expect(r.observation.length).toBeGreaterThan(0);
    expect(r.question.endsWith("?")).toBe(true);
  });

  it("farklı günlerde aynı örüntü için farklı sorular çıkabilir (çeşitlilik)", () => {
    const asked = new Set<string>();
    for (let d = 1; d <= 28; d++) {
      const day = `2026-10-${String(d).padStart(2, "0")}`;
      asked.add(selectDailyInsight(smokes, day)!.question);
    }
    expect(asked.size).toBeGreaterThan(1);
  });
});
