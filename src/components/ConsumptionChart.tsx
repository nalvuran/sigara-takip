import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { SectionLabel } from "./ui";

interface ChartPoint {
  date: string;
  label: string;
  consumption: number;
  baseLimit: number;
}

export function ConsumptionChart({ data }: { data: ChartPoint[] }) {
  if (data.length === 0) return null;
  return (
    <div>
      <SectionLabel>Günlük tüketim</SectionLabel>
      <div style={{ width: "100%", height: 160 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 6, right: 0, left: 0, bottom: 0 }} barSize={14}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--ink-faint)" }}
              interval="preserveStartEnd"
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={false}
              formatter={(value: number) => [`${value}`, "Sigara"]}
              labelFormatter={(label) => label}
              contentStyle={{
                borderRadius: 10,
                border: "none",
                fontSize: 12,
                background: "var(--surface)",
                boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
              }}
            />
            <ReferenceLine
              y={data[data.length - 1]?.baseLimit ?? 0}
              stroke="var(--border-soft)"
              strokeDasharray="3 3"
            />
            <Bar dataKey="consumption" radius={[3, 3, 0, 0]} fill="var(--accent)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
