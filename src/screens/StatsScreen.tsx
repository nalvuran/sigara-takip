import { useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useSmokesRange } from "../hooks/useSmokes";
import { useStatsData, type FilterKey } from "../hooks/useStatsData";
import { Card } from "../components/ui";
import { FilterChips } from "../components/FilterChips";
import { ReasonBreakdownCard } from "../components/ReasonBreakdownCard";
import { addDaysToDateString, todayLocalDateString } from "../logic/dateUtils";
import { selectDailyInsight } from "../logic/insights";

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
  const dailyInsight = useMemo(
    () => selectDailyInsight(allTimeSmokes, today),
    [allTimeSmokes, today]
  );

  return (
    <div className="max-w-xl mx-auto px-5 pt-8 pb-28 sm:pt-28">
      <h1 className="text-2xl font-bold mb-5">Ayna</h1>

      <Card className="!p-5 mb-5">
        <p className="text-xs text-[#6b7280] mb-2">💭 Bugünün yorumu</p>
        {dailyInsight ? (
          <p className="text-[15px] leading-relaxed text-[#1f2328]">{dailyInsight.text}</p>
        ) : (
          <p className="text-sm leading-relaxed text-[#6b7280]">
            Henüz yeterli veri yok. Birkaç gün daha kayıt ve sebep girdikçe, burada kendi
            örüntülerini yansıtan sorular belirecek.
          </p>
        )}
      </Card>

      <FilterChips value={filter} onChange={setFilter} />
      <ReasonBreakdownCard stats={stats} />
    </div>
  );
}
