import { useEffect, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import { useSmokesRange } from "../hooks/useSmokes";
import { useLedgerRange } from "../hooks/useLedgerRange";
import { useFlags } from "../hooks/useFlags";
import { setFlag } from "../services/firestoreService";
import { Card } from "../components/ui";
import { computeAchievementInput, evaluateAchievements } from "../logic/achievements";
import { addDaysToDateString, todayLocalDateString } from "../logic/dateUtils";

const ALL_TIME_LOOKBACK_DAYS = 3650;

const CATEGORY_LABELS: Record<string, string> = {
  sadakat: "Sadakat",
  farkindalik: "Farkındalık",
  kesif: "Keşif",
  eglenceli: "Eğlenceli",
};

export function AchievementsScreen() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const { flags } = useFlags(uid);

  const today = todayLocalDateString();
  const fromDate = addDaysToDateString(today, -ALL_TIME_LOOKBACK_DAYS);
  const smokes = useSmokesRange(uid, fromDate, today);
  const ledgerHistory = useLedgerRange(uid, fromDate, today);

  useEffect(() => {
    if (uid) setFlag(uid, "hasViewedAchievements");
  }, [uid]);

  const achievements = useMemo(() => {
    const input = computeAchievementInput(smokes, ledgerHistory.length, flags);
    return evaluateAchievements(input);
  }, [smokes, ledgerHistory, flags]);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const grouped = useMemo(() => {
    const order = ["sadakat", "farkindalik", "kesif", "eglenceli"];
    return order.map((cat) => ({
      category: cat,
      items: achievements.filter((a) => a.category === cat),
    }));
  }, [achievements]);

  return (
    <div className="max-w-xl mx-auto px-5 pt-8 pb-28 sm:pt-28">
      <h1 className="text-2xl font-bold mb-1">Başarılar</h1>
      <p className="text-[#6b7280] text-sm mb-5">
        {unlockedCount} / {achievements.length} rozet açıldı
      </p>

      {grouped.map((group) => (
        <div key={group.category} className="mb-6">
          <p className="text-sm font-semibold text-[#6b7280] mb-2 px-1">
            {CATEGORY_LABELS[group.category]}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {group.items.map((a) => (
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
      ))}
    </div>
  );
}
