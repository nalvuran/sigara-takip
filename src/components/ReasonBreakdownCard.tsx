import { Card } from "./ui";
import type { useStatsData } from "../hooks/useStatsData";

type Stats = ReturnType<typeof useStatsData>;

export function ReasonBreakdownCard({ stats }: { stats: Stats }) {
  if (stats.reasonBreakdown.length === 0) return null;
  return (
    <Card className="!p-4 mb-5">
      <p className="text-xs text-[var(--ink-soft)] mb-1">Neden içtin?</p>
      {stats.reasonInsight && (
        <p className="text-sm font-semibold text-[var(--accent)] mb-3">{stats.reasonInsight}</p>
      )}
      <div className="space-y-2.5 mt-2">
        {stats.reasonBreakdown.map((r) => (
          <div key={r.id}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm">
                {r.emoji} {r.label}
              </span>
              <span className="text-xs text-[var(--ink-soft)]">
                {r.count} · %{r.percent}
              </span>
            </div>
            <div className="h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  r.id === "belirtilmedi" ? "bg-[var(--muted-track)]" : "bg-[var(--accent)]"
                }`}
                style={{ width: `${r.percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
