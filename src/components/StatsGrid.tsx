import { Card } from "./ui";
import { formatMinutesAsDuration } from "../logic/allowance";
import type { useStatsData } from "../hooks/useStatsData";

type Stats = ReturnType<typeof useStatsData>;

export function StatsGrid({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCard label="Toplam sigara" value={String(stats.totalSmokes)} />
      <StatCard label="Günlük ortalama" value={stats.dailyAverage.toFixed(1)} />
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
        label="En uzun sigarasız süre"
        value={stats.longestGap !== null ? formatMinutesAsDuration(stats.longestGap) : "—"}
      />
      <StatCard label="Toplam harcama" value={`${stats.totalCost.toFixed(2)} TL`} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="!p-4">
      <p className="text-xs text-[#6b7280] mb-1">{label}</p>
      <p className="text-xl font-bold text-[#1f2328]">{value}</p>
    </Card>
  );
}
