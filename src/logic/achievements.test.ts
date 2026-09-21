import { describe, it, expect } from "vitest";
import { evaluateAchievements, ACHIEVEMENTS } from "./achievements";

describe("evaluateAchievements", () => {
  it("hiçbir koşul sağlanmıyorsa hepsi kilitli döner", () => {
    const result = evaluateAchievements({
      currentStreak: 0,
      longestStreak: 0,
      totalSavings: 0,
      totalDaysTracked: 0,
      goalReached: false,
    });
    expect(result.every((a) => !a.unlocked)).toBe(true);
    expect(result.length).toBe(ACHIEVEMENTS.length);
  });

  it("longestStreak 3 iken sadece streak_3 açılır, streak_7 açılmaz", () => {
    const result = evaluateAchievements({
      currentStreak: 3,
      longestStreak: 3,
      totalSavings: 0,
      totalDaysTracked: 3,
      goalReached: false,
    });
    const byId = Object.fromEntries(result.map((a) => [a.id, a.unlocked]));
    expect(byId.streak_3).toBe(true);
    expect(byId.streak_7).toBe(false);
  });

  it("totalSavings eşik değerlerini doğru değerlendirir", () => {
    const result = evaluateAchievements({
      currentStreak: 0,
      longestStreak: 0,
      totalSavings: 500,
      totalDaysTracked: 0,
      goalReached: false,
    });
    const byId = Object.fromEntries(result.map((a) => [a.id, a.unlocked]));
    expect(byId.savings_100).toBe(true);
    expect(byId.savings_500).toBe(true);
    expect(byId.savings_1000).toBe(false);
  });

  it("goalReached true ise goal_reached açılır", () => {
    const result = evaluateAchievements({
      currentStreak: 0,
      longestStreak: 0,
      totalSavings: 0,
      totalDaysTracked: 0,
      goalReached: true,
    });
    expect(result.find((a) => a.id === "goal_reached")?.unlocked).toBe(true);
  });
});
