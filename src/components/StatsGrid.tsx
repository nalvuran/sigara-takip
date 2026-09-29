import { Divider } from "./ui";
import { formatMinutesAsDuration } from "../logic/allowance";
import type { useStatsData } from "../hooks/useStatsData";

type Stats = ReturnType<typeof useStatsData>;

export function StatsGrid({ stats }: { stats: Stats }) {
  const secondary: { label: string; value: string }[] = [
    { label: "Günlük maksimum", value: String(stats.dailyMax) },
    { label: "Günlük minimum", value: String(stats.dailyMin) },
    {
      label: "Ortalama aralık",
      value:
        stats.averageInterval !== null
          ? formatMinutesAsDuration(stats.averageInterval)
          : "—",
    },
    {
      label: "Ort. aralık (gece dahil)",
      value:
        stats.averageIntervalOvernight !== null
          ? formatMinutesAsDuration(stats.averageIntervalOvernight)
          : "—",
    },
    {
      label: "En uzun sigarasız süre",
      value: stats.longestGap !== null ? formatMinutesAsDuration(stats.longestGap) : "—",
    },
    {
      label: "En uzun süre (gece dahil)",
      value:
        stats.longestGapOvernight !== null
          ? formatMinutesAsDuration(stats.longestGapOvernight)
          : "—",
    },
    { label: "Toplam harcama", value: `${stats.totalCost.toFixed(2)} TL` },
  ];

  return (
    <div>
      {/* Birincil metrikler: büyük, karaktersel */}
      <div className="grid grid-cols-3 gap-4 mb-8 animate-rise">
        <HeroMetric value={String(stats.totalSmokes)} label="Toplam sigara" />
        <HeroMetric value={stats.dailyAverage.toFixed(1)} label="Günlük ortalama" />
        <HeroMetric
          value={`${stats.dailyAverageCost.toFixed(0)}₺`}
          label="Günlük ort. harcama"
        />
      </div>

      {/* İkincil metrikler: sade, tipografik liste */}
      <div>
        {secondary.map((item, i) => (
          <div key={item.label}>
            <div className="flex items-baseline justify-between py-2.5">
              <span className="text-[13px] text-[var(--ink-soft)]">{item.label}</span>
              <span className="text-[14px] font-medium tabular-nums">{item.value}</span>
            </div>
            {i < secondary.length - 1 && <Divider />}
          </div>
        ))}
      </div>
    </div>
  );
}

function HeroMetric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-[28px] font-bold tracking-tight tabular-nums text-[var(--ink)] leading-none mb-1.5">
        {value}
      </div>
      <p className="text-[11px] text-[var(--ink-faint)] leading-snug">{label}</p>
    </div>
  );
}
