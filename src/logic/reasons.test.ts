import { describe, it, expect } from "vitest";
import { calculateReasonBreakdown, buildReasonInsight, getReasonDef } from "./reasons";

describe("calculateReasonBreakdown", () => {
  it("boş listede boş dizi döner", () => {
    expect(calculateReasonBreakdown([])).toEqual([]);
  });

  it("sebepleri doğru sayar ve yüzdeleri hesaplar", () => {
    const smokes = [
      { reason: "stres" },
      { reason: "stres" },
      { reason: "keyif" },
      { reason: null },
    ];
    const result = calculateReasonBreakdown(smokes);
    const byId = Object.fromEntries(result.map((r) => [r.id, r]));
    expect(byId.stres.count).toBe(2);
    expect(byId.stres.percent).toBe(50);
    expect(byId.keyif.count).toBe(1);
    expect(byId.belirtilmedi.count).toBe(1);
  });

  it("bilinmeyen bir reason değeri belirtilmedi altına düşer", () => {
    const result = calculateReasonBreakdown([{ reason: "gecersiz-deger" }]);
    expect(result[0].id).toBe("belirtilmedi");
    expect(result[0].count).toBe(1);
  });

  it("sonucu sayıya göre azalan sırada döner", () => {
    const smokes = [
      { reason: "sosyal" },
      { reason: "stres" },
      { reason: "stres" },
      { reason: "stres" },
    ];
    const result = calculateReasonBreakdown(smokes);
    expect(result[0].id).toBe("stres");
    expect(result[0].count).toBe(3);
  });
});

describe("buildReasonInsight", () => {
  it("yeterli veri yoksa (top.count < 3) null döner", () => {
    const breakdown = calculateReasonBreakdown([{ reason: "stres" }, { reason: "stres" }]);
    expect(buildReasonInsight(breakdown)).toBeNull();
  });

  it("sadece belirtilmedi varsa null döner", () => {
    const breakdown = calculateReasonBreakdown([{ reason: null }, { reason: null }, { reason: null }]);
    expect(buildReasonInsight(breakdown)).toBeNull();
  });

  it("yeterli veri varsa en sık nedeni özetler", () => {
    const smokes = [
      { reason: "stres" },
      { reason: "stres" },
      { reason: "stres" },
      { reason: "keyif" },
    ];
    const breakdown = calculateReasonBreakdown(smokes);
    const insight = buildReasonInsight(breakdown);
    expect(insight).toContain("Stres");
    expect(insight).toContain("%75");
  });
});

describe("getReasonDef", () => {
  it("bilinen id için doğru tanımı döner", () => {
    expect(getReasonDef("stres").label).toBe("Stres");
  });

  it("null/bilinmeyen için Belirtilmedi döner", () => {
    expect(getReasonDef(null).label).toBe("Belirtilmedi");
    expect(getReasonDef("xyz").label).toBe("Belirtilmedi");
  });
});
