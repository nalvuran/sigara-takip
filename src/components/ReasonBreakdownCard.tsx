import { SectionLabel } from "./ui";
import type { useStatsData } from "../hooks/useStatsData";

type Stats = ReturnType<typeof useStatsData>;

export function ReasonBreakdownCard({ stats }: { stats: Stats }) {
  if (stats.reasonBreakdown.length === 0) return null;
  return (
    <div>
      <SectionLabel>Nedenler</SectionLabel>
      {stats.reasonInsight && (
        <p className="text-[13px] text-[var(--ink-soft)] mb-4 -mt-1">{stats.reasonInsight}</p>
      )}
      <div className="flex flex-col gap-3.5">
        {stats.reasonBreakdown.map((r) => (
          <div key={r.id} className="flex items-center gap-3">
            <span className="text-[13px] text-[var(--ink)] w-[124px] shrink-0 truncate">
              {r.label}
            </span>
            <div className="flex-1 h-[3px] bg-[var(--border-soft)] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  r.id === "belirtilmedi" ? "bg-[var(--muted-track)]" : "bg-[var(--accent)]"
                }`}
                style={{ width: `${r.percent}%` }}
              />
            </div>
            <span className="text-[12px] text-[var(--ink-faint)] tabular-nums w-9 text-right">
              %{r.percent}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
