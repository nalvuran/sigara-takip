import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useSmokesRange } from "../hooks/useSmokes";
import { useStatsData, type FilterKey } from "../hooks/useStatsData";
import { useDailyInsight } from "../hooks/useDailyInsight";
import { Divider } from "../components/ui";
import { FilterChips } from "../components/FilterChips";
import { ReasonBreakdownCard } from "../components/ReasonBreakdownCard";
import { addDaysToDateString, todayLocalDateString } from "../logic/dateUtils";

const ALL_TIME_LOOKBACK_DAYS = 3650;

/** Ayna: editorial yorum ve örüntü ekranı (sayısal kartlar ve grafik Ana Sayfa'da). */
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
    <div className="max-w-xl mx-auto px-6 pt-14 pb-32 sm:pt-32">
      <h1 className="font-serif-display text-[34px] text-[var(--ink)] mb-9 leading-none">
        Ayna
      </h1>

      {/* Bugünün gözlemi — editorial blok, kart yok */}
      <div className="mb-10">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-[var(--ink-faint)] uppercase mb-3">
          Bugünün gözlemi
        </p>

        {dailyInsight ? (
          <>
            <p className="text-[16px] leading-[1.6] text-[var(--ink)]">
              {dailyInsight.observation}
            </p>

            <p className="text-[11px] font-semibold tracking-[0.14em] text-[var(--ink-faint)] uppercase mt-7 mb-2">
              Kendine sor
            </p>
            <p className="font-serif-display text-[22px] leading-snug text-[var(--ink)]">
              {dailyInsight.question}
            </p>

            <Divider />
            <div className="pt-5">
              <p className="font-serif-display text-[17px] leading-relaxed text-[var(--quote)]">
                “{dailyInsight.quote.text}”
              </p>
              <p className="text-[11px] tracking-[0.1em] text-[var(--ink-faint)] uppercase mt-2">
                {dailyInsight.quote.author}
                {dailyInsight.quote.source ? ` · ${dailyInsight.quote.source}` : ""}
              </p>
            </div>
          </>
        ) : (
          <p className="text-[15px] leading-relaxed text-[var(--ink-soft)]">
            Henüz yeterli veri yok. Birkaç gün daha kayıt ve sebep girdikçe, burada kendi
            örüntülerini yansıtan yorumlar belirecek.
          </p>
        )}
      </div>

      <Divider />
      <div className="mt-8">
        <FilterChips value={filter} onChange={setFilter} />
        <ReasonBreakdownCard stats={stats} />
      </div>
    </div>
  );
}
