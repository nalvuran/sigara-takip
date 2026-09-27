import { describe, it, expect } from "vitest";
import {
  evaluateAchievements,
  computeAchievementInput,
  ACHIEVEMENTS,
} from "./achievements";

describe("computeAchievementInput", () => {
  it("boş veriyle güvenli varsayılanlar üretir", () => {
    const input = computeAchievementInput([], 0, {});
    expect(input.totalRecords).toBe(0);
    expect(input.totalDaysTracked).toBe(0);
    expect(input.distinctReasonsUsed).toBe(0);
    expect(input.nightOwl).toBe(false);
    expect(input.earlyBird).toBe(false);
    expect(input.weekendRecords).toBe(0);
    expect(input.longestGapMinutes).toBeNull();
    expect(input.maxSameHourDays).toBe(0);
    expect(input.flags.hasUsedUndo).toBe(false);
  });

  it("geçerli sebepleri sayar, geçersizleri yok sayar", () => {
    const smokes = [
      { timestamp: Date.now(), reason: "stres" },
      { timestamp: Date.now(), reason: "keyif" },
      { timestamp: Date.now(), reason: "gecersiz" },
      { timestamp: Date.now(), reason: null },
    ];
    const input = computeAchievementInput(smokes, 1, {});
    expect(input.distinctReasonsUsed).toBe(2);
    expect(input.totalRecords).toBe(4);
  });

  it("00:00-05:00 arası kaydı nightOwl olarak işaretler", () => {
    // 19 Eylül 2026, 02:30 Türkiye saati (UTC+3) -> UTC 18 Eylül 23:30
    const ts = new Date("2026-09-18T23:30:00Z").getTime();
    const input = computeAchievementInput([{ timestamp: ts }], 1, {});
    expect(input.nightOwl).toBe(true);
    expect(input.earlyBird).toBe(false);
  });

  it("05:00-08:00 arası kaydı earlyBird olarak işaretler", () => {
    // 19 Eylül 2026, 06:30 Türkiye saati -> UTC 03:30
    const ts = new Date("2026-09-19T03:30:00Z").getTime();
    const input = computeAchievementInput([{ timestamp: ts }], 1, {});
    expect(input.earlyBird).toBe(true);
    expect(input.nightOwl).toBe(false);
  });

  it("hafta sonu kayıtlarını doğru sayar", () => {
    // 19 Eylül 2026 bir Cumartesi (Türkiye saatiyle öğlen)
    const saturday = new Date("2026-09-19T12:00:00+03:00").getTime();
    // 21 Eylül 2026 bir Pazartesi
    const monday = new Date("2026-09-21T12:00:00+03:00").getTime();
    const input = computeAchievementInput(
      [{ timestamp: saturday }, { timestamp: saturday }, { timestamp: monday }],
      2,
      {}
    );
    expect(input.weekendRecords).toBe(2);
  });

  it("aynı saatte farklı günlerdeki kayıtları maxSameHourDays ile sayar", () => {
    const day1 = new Date("2026-09-15T09:10:00+03:00").getTime();
    const day2 = new Date("2026-09-16T09:40:00+03:00").getTime();
    const day3 = new Date("2026-09-17T14:00:00+03:00").getTime();
    const input = computeAchievementInput(
      [{ timestamp: day1 }, { timestamp: day2 }, { timestamp: day3 }],
      3,
      {}
    );
    // 09:xx saatinde 2 farklı gün, 14:xx saatinde 1 gün -> max 2
    expect(input.maxSameHourDays).toBe(2);
  });

  it("bayrakları normalize eder (undefined -> false)", () => {
    const input = computeAchievementInput([], 0, { hasUsedUndo: true });
    expect(input.flags.hasUsedUndo).toBe(true);
    expect(input.flags.hasSetReason).toBe(false);
  });
});

describe("evaluateAchievements", () => {
  it("hiçbir koşul sağlanmıyorsa hepsi kilitli döner", () => {
    const input = computeAchievementInput([], 0, {});
    const result = evaluateAchievements(input);
    expect(result.every((a) => !a.unlocked)).toBe(true);
    expect(result.length).toBe(ACHIEVEMENTS.length);
    expect(result.length).toBeGreaterThanOrEqual(20);
  });

  it("hiçbir rozet 'azaltma/tasarruf' temelli değil (para/limit referansı yok)", () => {
    // Tasarım ilkesini kod seviyesinde de garanti altına alan bir kontrol:
    // açıklamalarda TL veya "limit" geçmemeli. \b ile kelime sınırı kullanılır
    // ki "sessizlik" gibi kelimelerin içindeki "tl" harfleri yanlış pozitif vermesin.
    for (const a of ACHIEVEMENTS) {
      const text = a.description.toLowerCase();
      expect(text).not.toMatch(/\btl\b/);
      expect(text).not.toContain("₺");
      expect(text).not.toContain("limit");
      expect(text).not.toContain("hedef");
    }
  });

  it("totalRecords >= 1 iken sadece ilk_kayit açılır, kayit_50 açılmaz", () => {
    const input = computeAchievementInput([{ timestamp: Date.now() }], 1, {});
    const byId = Object.fromEntries(
      evaluateAchievements(input).map((a) => [a.id, a.unlocked])
    );
    expect(byId.ilk_kayit).toBe(true);
    expect(byId.kayit_50).toBe(false);
  });

  it("beş farklı sebep kullanılınca oruntu_kasifi açılır", () => {
    const smokes = ["stres", "keyif", "sosyal", "aliskanlik", "sikinti"].map(
      (reason) => ({ timestamp: Date.now(), reason })
    );
    const input = computeAchievementInput(smokes, 1, {});
    const byId = Object.fromEntries(
      evaluateAchievements(input).map((a) => [a.id, a.unlocked])
    );
    expect(byId.oruntu_kasifi).toBe(true);
  });

  it("flags üzerinden kesif ve sadakat rozetleri doğru açılır", () => {
    const input = computeAchievementInput([], 0, {
      hasUsedUndo: true,
      hasViewedStats: true,
    });
    const byId = Object.fromEntries(
      evaluateAchievements(input).map((a) => [a.id, a.unlocked])
    );
    expect(byId.toparlayici).toBe(true);
    expect(byId.ilk_bakis).toBe(true);
    expect(byId.gecmisini_gordun).toBe(false);
  });
});
