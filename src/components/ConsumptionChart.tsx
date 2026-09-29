import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { Card } from "./ui";

interface ChartPoint {
  date: string;
  label: string;
  consumption: number;
  baseLimit: number;
}

export function ConsumptionChart({ data }: { data: ChartPoint[] }) {
  if (data.length === 0) return null;
  return (
    <Card className="!p-4">
      <p className="text-xs text-[var(--ink-soft)] mb-3">Günlük tüketim</p>
      <div style={{ width: "100%", height: 200 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--surface-2)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--ink-faint)" }}
              interval="preserveStartEnd"
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--ink-faint)" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              formatter={(value: number) => [`${value} sigara`, "Tüketim"]}
              labelFormatter={(label) => `Tarih: ${label}`}
              contentStyle={{ borderRadius: 12, border: "none", fontSize: 12 }}
            />
            <ReferenceLine
              y={data[data.length - 1]?.baseLimit ?? 0}
              stroke="var(--ink-faint)"
              strokeDasharray="4 4"
              label={{ value: "limit", position: "insideTopRight", fontSize: 10, fill: "var(--ink-faint)" }}
            />
            <Bar dataKey="consumption" radius={[6, 6, 0, 0]} fill="var(--accent)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
