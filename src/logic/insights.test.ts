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
    expect(found!.text).toContain("akşam");
    expect(found!.text).toContain("?");
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
    expect(dominant!.text.toLowerCase()).toContain("stres");
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
    expect(gap!.text).toContain("?");
  });

  it("hiçbir yorum metni yönlendirici/yargılayıcı ifade içermiyor (tasarım ilkesi kontrolü)", () => {
    const smokes = [
      ...Array.from({ length: 6 }, (_, i) => mk(`2026-09-0${i + 1}`, 20, "stres")),
    ];
    const result = collectInsights(smokes);
    for (const insight of result) {
      const t = insight.text.toLowerCase();
      expect(t).not.toContain("azalt");
      expect(t).not.toContain("bırak");
      expect(t).not.toContain("yapmalısın");
      expect(t).not.toContain("iyi gidiyorsun");
      expect(t.endsWith("?")).toBe(true);
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

  it("tek aday varken hangi gün olursa olsun o adayı döner", () => {
    const a = selectDailyInsight(smokes, "2026-09-20");
    const b = selectDailyInsight(smokes, "2026-09-21");
    expect(a).toEqual(b); // çünkü tek aday var, hash ne olursa olsun aynı index (0 % 1 = 0)
  });
});
