import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useSmokesRange } from "../hooks/useSmokes";
import { useStatsData, type FilterKey } from "../hooks/useStatsData";
import { useDailyInsight } from "../hooks/useDailyInsight";
import { Card } from "../components/ui";
import { FilterChips } from "../components/FilterChips";
import { ReasonBreakdownCard } from "../components/ReasonBreakdownCard";
import { addDaysToDateString, todayLocalDateString } from "../logic/dateUtils";

const ALL_TIME_LOOKBACK_DAYS = 3650;

/** İstatistikler: yorumlama ve örüntü ekranı (sayısal kartlar ve grafik Ana Sayfa'da). */
export function StatsScreen() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [filter, setFilter] = useState<FilterKey>("7d");
  const stats = useStatsData(uid, filter);

  // Günlük yorum, seçili filtreden bağımsız olarak TÜM zamanlardaki veriye bakar.
  const today = todayLocalDateString();
  const allTimeSmokes = useSmokesRange(
    uid,
    addDaysToDateString(today, -ALL_TIME_LOOKBACK_DAYS),
    today
  );
  const dailyInsight = useDailyInsight(uid, allTimeSmokes, today);

  return (
    <div className="max-w-xl mx-auto px-5 pt-8 pb-28 sm:pt-28">
      <h1 className="text-2xl font-bold mb-5">Ayna</h1>

      <Card className="!p-5 mb-5">
        <p className="text-xs text-[var(--ink-soft)] mb-2">💭 Bugünün yorumu</p>
        {dailyInsight ? (
          <>
            <p className="text-[15px] leading-relaxed text-[var(--ink)]">
              {dailyInsight.observation}
            </p>
            <p className="text-[15px] leading-relaxed font-medium text-[var(--accent)] mt-3">
              {dailyInsight.question}
            </p>
            <div className="mt-4 pt-4 border-t border-[var(--border)]">
              <p className="text-sm italic leading-relaxed text-[var(--quote)]">
                “{dailyInsight.quote.text}”
              </p>
              <p className="text-xs text-[var(--ink-faint)] mt-1.5">
                — {dailyInsight.quote.author}
                {dailyInsight.quote.source ? `, ${dailyInsight.quote.source}` : ""}
              </p>
            </div>
          </>
        ) : (
          <p className="text-sm leading-relaxed text-[var(--ink-soft)]">
            Henüz yeterli veri yok. Birkaç gün daha kayıt ve sebep girdikçe, burada kendi
            örüntülerini yansıtan yorumlar belirecek.
          </p>
        )}
      </Card>

      <FilterChips value={filter} onChange={setFilter} />
      <ReasonBreakdownCard stats={stats} />
    </div>
  );
}
