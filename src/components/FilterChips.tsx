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
            value === f.key ? "bg-[#16a34a] text-white" : "bg-[#f1f2f4] text-[#1f2328]"
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
