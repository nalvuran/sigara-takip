import { useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import { useUserSettings } from "../hooks/useUserSettings";
import { useGoal } from "../hooks/useGoal";
import { useLedgerRange } from "../hooks/useLedgerRange";
import { Card } from "../components/ui";
import { calculateCostPerCigarette } from "../logic/allowance";
import { calculateCurrentStreak, calculateLongestStreak } from "../logic/goals";
import { evaluateAchievements } from "../logic/achievements";
import { addDaysToDateString, todayLocalDateString } from "../logic/dateUtils";

const ALL_TIME_LOOKBACK_DAYS = 3650;

export function AchievementsScreen() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const settings = useUserSettings(uid);
  const { goal } = useGoal(uid);

  const today = todayLocalDateString();
  const fromDate = addDaysToDateString(today, -ALL_TIME_LOOKBACK_DAYS);
  const ledgerHistory = useLedgerRange(uid, fromDate, today);

  const costPerCigarette = settings
    ? calculateCostPerCigarette(settings.packagePrice, settings.cigarettesPerPack)
    : 0;

  const achievements = useMemo(() => {
    const totalSavings = ledgerHistory.reduce(
      (sum, e) => sum + Math.max(0, e.baseLimit - e.consumption) * costPerCigarette,
      0
    );
    const currentStreak = calculateCurrentStreak(ledgerHistory);
    const longestStreak = calculateLongestStreak(ledgerHistory);
    const goalReached = goal ? (settings?.dailyLimit ?? Infinity) <= goal.targetLimit : false;

    return evaluateAchievements({
      currentStreak,
      longestStreak,
      totalSavings,
      totalDaysTracked: ledgerHistory.length,
      goalReached,
    });
  }, [ledgerHistory, costPerCigarette, goal, settings]);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="max-w-xl mx-auto px-5 pt-8 pb-28 sm:pt-28">
      <h1 className="text-2xl font-bold mb-1">Başarılar</h1>
      <p className="text-[#6b7280] text-sm mb-5">
        {unlockedCount} / {achievements.length} rozet açıldı
      </p>

      <div className="grid grid-cols-2 gap-3">
        {achievements.map((a) => (
          <Card
            key={a.id}
            className={`!p-4 ${a.unlocked ? "" : "opacity-40 grayscale"}`}
          >
            <div className="text-3xl mb-2">{a.icon}</div>
            <p className="text-sm font-semibold mb-1">{a.title}</p>
            <p className="text-xs text-[#6b7280]">{a.description}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
