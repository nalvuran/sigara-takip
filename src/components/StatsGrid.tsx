import { Card } from "./ui";
import { formatMinutesAsDuration } from "../logic/allowance";
import type { useStatsData } from "../hooks/useStatsData";

type Stats = ReturnType<typeof useStatsData>;

export function StatsGrid({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCard label="Toplam sigara" value={String(stats.totalSmokes)} />
      <StatCard label="Günlük ortalama" value={stats.dailyAverage.toFixed(1)} />
      <StatCard
        label="Günlük ortalama harcama"
        value={`${stats.dailyAverageCost.toFixed(2)} TL`}
      />
      <StatCard label="Günlük maksimum" value={String(stats.dailyMax)} />
      <StatCard label="Günlük minimum" value={String(stats.dailyMin)} />
      <StatCard
        label="Ortalama aralık"
        value={
          stats.averageInterval !== null
            ? formatMinutesAsDuration(stats.averageInterval)
            : "—"
        }
      />
      <StatCard
        label="Ort. aralık (gece dahil)"
        value={
          stats.averageIntervalOvernight !== null
            ? formatMinutesAsDuration(stats.averageIntervalOvernight)
            : "—"
        }
      />
      <StatCard
        label="En uzun sigarasız süre"
        value={stats.longestGap !== null ? formatMinutesAsDuration(stats.longestGap) : "—"}
      />
      <StatCard
        label="En uzun süre (gece dahil)"
        value={
          stats.longestGapOvernight !== null
            ? formatMinutesAsDuration(stats.longestGapOvernight)
            : "—"
        }
      />
      <StatCard label="Toplam harcama" value={`${stats.totalCost.toFixed(2)} TL`} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="!p-4">
      <p className="text-xs text-[var(--ink-soft)] mb-1">{label}</p>
      <p className="text-xl font-bold text-[var(--ink)]">{value}</p>
    </Card>
  );
}
