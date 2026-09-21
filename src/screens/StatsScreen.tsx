import { useMemo, useState } from "react";
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
import { useAuth } from "../hooks/useAuth";
import { useUserSettings } from "../hooks/useUserSettings";
import { useSmokesRange } from "../hooks/useSmokes";
import { useLedgerRange } from "../hooks/useLedgerRange";
import { Card } from "../components/ui";
import {
  calculateCostPerCigarette,
  calculateSmokingIntervals,
  calculateAverageInterval,
  calculateLongestSmokeFreeInterval,
  formatMinutesAsDuration,
} from "../logic/allowance";
import { addDaysToDateString, todayLocalDateString } from "../logic/dateUtils";

type FilterKey = "today" | "7d" | "30d" | "all";

const FILTERS: { key: FilterKey; label: string; days: number | null }[] = [
  { key: "today", label: "Bugün", days: 0 },
  { key: "7d", label: "Son 7 gün", days: 7 },
  { key: "30d", label: "Son 30 gün", days: 30 },
  { key: "all", label: "Tüm zamanlar", days: null },
];

const ALL_TIME_LOOKBACK_DAYS = 3650; // ~10 yıl, pratik üst sınır

export function StatsScreen() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const settings = useUserSettings(uid);
  const [filter, setFilter] = useState<FilterKey>("7d");

  const today = todayLocalDateString();
  const activeFilter = FILTERS.find((f) => f.key === filter)!;
  const fromDate = addDaysToDateString(
    today,
    activeFilter.days === null ? -ALL_TIME_LOOKBACK_DAYS : -activeFilter.days
  );

  const smokes = useSmokesRange(uid, fromDate, today);
  const ledgerEntries = useLedgerRange(uid, fromDate, today);

  const costPerCigarette = settings
    ? calculateCostPerCigarette(settings.packagePrice, settings.cigarettesPerPack)
    : 0;

  const stats = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const s of smokes) {
      byDay.set(s.localDate, (byDay.get(s.localDate) ?? 0) + 1);
    }
    const dayCounts = Array.from(byDay.values());
    const totalSmokes = smokes.length;
    const dailyAverage = dayCounts.length ? totalSmokes / dayCounts.length : 0;
    const dailyMax = dayCounts.length ? Math.max(...dayCounts) : 0;
    const dailyMin = dayCounts.length ? Math.min(...dayCounts) : 0;

    // Aralıklar günlük bazda hesaplanır (gece geçişleri aralığa katılmaz).
    let allIntervals: number[] = [];
    for (const [, list] of Array.from(
      smokes.reduce((map, s) => {
        const arr = map.get(s.localDate) ?? [];
        arr.push(s.timestamp);
        map.set(s.localDate, arr);
        return map;
      }, new Map<string, number[]>())
    )) {
      allIntervals = allIntervals.concat(calculateSmokingIntervals(list));
    }

    const totalCost = ledgerEntries.reduce(
      (sum, e) => sum + e.consumption * costPerCigarette,
      0
    );
    const totalSavings = ledgerEntries.reduce(
      (sum, e) => sum + Math.max(0, e.baseLimit - e.consumption) * costPerCigarette,
      0
    );

    const chartData = [...ledgerEntries]
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .slice(-60) // okunabilirlik için en fazla son 60 gün
      .map((e) => ({
        date: e.date,
        label: `${e.date.slice(8, 10)}/${e.date.slice(5, 7)}`,
        consumption: e.consumption,
        baseLimit: e.baseLimit,
      }));

    return {
      totalSmokes,
      dailyAverage,
      dailyMax,
      dailyMin,
      averageInterval: calculateAverageInterval(allIntervals),
      longestGap: calculateLongestSmokeFreeInterval(allIntervals),
      totalCost,
      totalSavings,
      chartData,
    };
  }, [smokes, ledgerEntries, costPerCigarette]);

  return (
    <div className="max-w-xl mx-auto px-5 pt-8 pb-28 sm:pt-28">
      <h1 className="text-2xl font-bold mb-5">İstatistikler</h1>

      <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f.key
                ? "bg-[#16a34a] text-white"
                : "bg-[#f1f2f4] text-[#1f2328]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {stats.chartData.length > 0 && (
        <Card className="!p-4 mb-5">
          <p className="text-xs text-[#6b7280] mb-3">Günlük tüketim</p>
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={stats.chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f2f4" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  interval="preserveStartEnd"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  formatter={(value: number) => [`${value} sigara`, "Tüketim"]}
                  labelFormatter={(label) => `Tarih: ${label}`}
                  contentStyle={{ borderRadius: 12, border: "none", fontSize: 12 }}
                />
                <ReferenceLine
                  y={stats.chartData[stats.chartData.length - 1]?.baseLimit ?? 0}
                  stroke="#9ca3af"
                  strokeDasharray="4 4"
                  label={{ value: "limit", position: "insideTopRight", fontSize: 10, fill: "#9ca3af" }}
                />
                <Bar dataKey="consumption" radius={[6, 6, 0, 0]} fill="#16a34a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

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
          value={
            stats.longestGap !== null ? formatMinutesAsDuration(stats.longestGap) : "—"
          }
        />
        <StatCard label="Toplam harcama" value={`${stats.totalCost.toFixed(2)} TL`} />
        <StatCard
          label="İçilmeyen sigara değeri"
          value={`${stats.totalSavings.toFixed(2)} TL`}
          accent
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <Card className="!p-4">
      <p className="text-xs text-[#6b7280] mb-1">{label}</p>
      <p className={`text-xl font-bold ${accent ? "text-[#16a34a]" : "text-[#1f2328]"}`}>
        {value}
      </p>
    </Card>
  );
}
