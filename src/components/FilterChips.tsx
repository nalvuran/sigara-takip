import { FILTERS, type FilterKey } from "../hooks/useStatsData";

export function FilterChips({
  value,
  onChange,
}: {
  value: FilterKey;
  onChange: (key: FilterKey) => void;
}) {
  return (
    <div className="flex bg-[var(--surface-2)] rounded-full p-1 mb-6">
      {FILTERS.map((f) => (
        <button
          key={f.key}
          onClick={() => onChange(f.key)}
          className={`flex-1 py-1.5 rounded-full text-[12.5px] font-medium whitespace-nowrap transition-colors ${
            value === f.key
              ? "bg-[var(--surface)] text-[var(--ink)]"
              : "text-[var(--ink-faint)]"
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
