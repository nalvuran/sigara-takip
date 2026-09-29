import { FILTERS, type FilterKey } from "../hooks/useStatsData";

export function FilterChips({
  value,
  onChange,
}: {
  value: FilterKey;
  onChange: (key: FilterKey) => void;
}) {
  return (
    <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar">
      {FILTERS.map((f) => (
        <button
          key={f.key}
          onClick={() => onChange(f.key)}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            value === f.key ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-2)] text-[var(--ink)]"
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
