import { describe, it, expect } from "vitest";
import {
  calculateGoalProgress,
  calculateCurrentStreak,
  calculateLongestStreak,
  type Goal,
} from "./goals";

describe("calculateGoalProgress", () => {
  const goal: Goal = {
    startDate: "2026-09-01",
    startLimit: 10,
    targetLimit: 5,
    targetDate: "2026-10-01", // 30 gün
  };

  it("başlangıçta (gün 0) beklenen limit başlangıç limitine eşit olmalı", () => {
    const progress = calculateGoalProgress(goal, 10, "2026-09-01");
    expect(progress.expectedLimit).toBeCloseTo(10, 0);
    expect(progress.percentComplete).toBe(0);
  });

  it("yarı yolda (gün 15) beklenen limit ortalama olmalı", () => {
    const progress = calculateGoalProgress(goal, 8, "2026-09-16");
    expect(progress.expectedLimit).toBeCloseTo(7.5, 0);
    expect(progress.percentComplete).toBeCloseTo(50, 0);
  });

  it("hedef tarihte beklenen limit hedef limite eşit olmalı", () => {
    const progress = calculateGoalProgress(goal, 5, "2026-10-01");
    expect(progress.expectedLimit).toBeCloseTo(5, 0);
    expect(progress.percentComplete).toBe(100);
  });

  it("mevcut limit beklenenden düşükse hedefin ilerisinde sayılır", () => {
    const progress = calculateGoalProgress(goal, 6, "2026-09-16"); // beklenen ~7.5
    expect(progress.isAheadOrOnTrack).toBe(true);
  });

  it("mevcut limit beklenenden yüksekse geride sayılır", () => {
    const progress = calculateGoalProgress(goal, 9, "2026-09-16"); // beklenen ~7.5
    expect(progress.isAheadOrOnTrack).toBe(false);
  });

  it("targetDate yoksa (tarihsiz hedef) percentComplete null döner", () => {
    const noDateGoal: Goal = { ...goal, targetDate: null };
    const progress = calculateGoalProgress(noDateGoal, 8, "2026-09-16");
    expect(progress.percentComplete).toBeNull();
    expect(progress.daysTotal).toBeNull();
  });
});

describe("calculateCurrentStreak / calculateLongestStreak", () => {
  it("son günden geriye doğru kesintisiz limit altı günleri sayar", () => {
    const days = [
      { date: "2026-09-14", baseLimit: 10, consumption: 12 }, // limit aşıldı
      { date: "2026-09-15", baseLimit: 10, consumption: 8 },
      { date: "2026-09-16", baseLimit: 10, consumption: 7 },
      { date: "2026-09-17", baseLimit: 10, consumption: 10 },
    ];
    expect(calculateCurrentStreak(days)).toBe(3);
  });

  it("son gün limit aşılmışsa güncel seri 0'dır", () => {
    const days = [
      { date: "2026-09-15", baseLimit: 10, consumption: 8 },
      { date: "2026-09-16", baseLimit: 10, consumption: 12 },
    ];
    expect(calculateCurrentStreak(days)).toBe(0);
  });

  it("en uzun seriyi geçmişten bulur, güncel seriden büyük olabilir", () => {
    const days = [
      { date: "2026-09-10", baseLimit: 10, consumption: 5 },
      { date: "2026-09-11", baseLimit: 10, consumption: 5 },
      { date: "2026-09-12", baseLimit: 10, consumption: 5 },
      { date: "2026-09-13", baseLimit: 10, consumption: 5 },
      { date: "2026-09-14", baseLimit: 10, consumption: 12 }, // seri kırıldı
      { date: "2026-09-15", baseLimit: 10, consumption: 8 },
    ];
    expect(calculateLongestStreak(days)).toBe(4);
    expect(calculateCurrentStreak(days)).toBe(1);
  });

  it("boş dizi için 0 döner", () => {
    expect(calculateCurrentStreak([])).toBe(0);
    expect(calculateLongestStreak([])).toBe(0);
  });
});
