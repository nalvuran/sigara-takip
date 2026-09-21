export interface AchievementInput {
  currentStreak: number; // gün
  longestStreak: number; // gün
  totalSavings: number; // TL
  totalDaysTracked: number; // ledger kaydı olan toplam gün
  goalReached: boolean; // hedef limitine ulaşıldı mı
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  isUnlocked: (input: AchievementInput) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "streak_3",
    title: "3 Gün Seri",
    description: "3 gün üst üste günlük limitin altında kaldın.",
    icon: "🔥",
    isUnlocked: (i) => i.longestStreak >= 3,
  },
  {
    id: "streak_7",
    title: "1 Hafta Seri",
    description: "7 gün üst üste günlük limitin altında kaldın.",
    icon: "🌟",
    isUnlocked: (i) => i.longestStreak >= 7,
  },
  {
    id: "streak_30",
    title: "1 Ay Seri",
    description: "30 gün üst üste günlük limitin altında kaldın.",
    icon: "🏆",
    isUnlocked: (i) => i.longestStreak >= 30,
  },
  {
    id: "savings_100",
    title: "100 TL Tasarruf",
    description: "İçmediğin sigaraların değeri 100 TL'yi geçti.",
    icon: "💚",
    isUnlocked: (i) => i.totalSavings >= 100,
  },
  {
    id: "savings_500",
    title: "500 TL Tasarruf",
    description: "İçmediğin sigaraların değeri 500 TL'yi geçti.",
    icon: "💰",
    isUnlocked: (i) => i.totalSavings >= 500,
  },
  {
    id: "savings_1000",
    title: "1000 TL Tasarruf",
    description: "İçmediğin sigaraların değeri 1000 TL'yi geçti.",
    icon: "💎",
    isUnlocked: (i) => i.totalSavings >= 1000,
  },
  {
    id: "tracked_30_days",
    title: "Sadık Takipçi",
    description: "30 gün boyunca uygulamayı kullandın.",
    icon: "📅",
    isUnlocked: (i) => i.totalDaysTracked >= 30,
  },
  {
    id: "goal_reached",
    title: "Hedefe Ulaştın",
    description: "Belirlediğin günlük limit hedefine ulaştın.",
    icon: "🎯",
    isUnlocked: (i) => i.goalReached,
  },
];

export function evaluateAchievements(input: AchievementInput) {
  return ACHIEVEMENTS.map((a) => ({
    ...a,
    unlocked: a.isUnlocked(input),
  }));
}
