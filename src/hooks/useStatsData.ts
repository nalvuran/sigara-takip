import { useEffect, useMemo, useState } from "react";
import { useUserSettings } from "./useUserSettings";
import { useSmokesRange } from "./useSmokes";
import { useLedgerRange } from "./useLedgerRange";
import {
  calculateCostPerCigarette,
  calculateSmokingIntervals,
  calculateAverageInterval,
  calculateLongestSmokeFreeInterval,
} from "../logic/allowance";
import { addDaysToDateString, todayLocalDateString } from "../logic/dateUtils";
import { calculateReasonBreakdown, buildReasonInsight } from "../logic/reasons";

export type FilterKey = "today" | "7d" | "30d" | "all";

export const FILTERS: { key: FilterKey; label: string; days: number | null }[] = [
  { key: "today", label: "Bugün", days: 0 },
  { key: "7d", label: "Son 7 gün", days: 7 },
  { key: "30d", label: "Son 30 gün", days: 30 },
  { key: "all", label: "Tüm zamanlar", days: null },
];

const ALL_TIME_LOOKBACK_DAYS = 3650; // ~10 yıl, pratik üst sınır

/** Seçili zaman filtresine göre istatistikleri (kartlar, grafik, sebep dağılımı) hesaplar. */
export function useStatsData(uid: string | null, filter: FilterKey) {
  const settings = useUserSettings(uid);

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

  // "En uzun sigarasız süre", son sigaradan bu yana geçen ve henüz bir
  // sonraki sigarayla "kapanmamış" olan süreyi de aday olarak görebilsin diye
  // dakikada bir tazelenir (aksi halde yalnızca iki KAYITLI sigara arasındaki
  // geçmiş boşluklara bakar, hâlâ süren güncel boşluğu asla göremezdi).
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  return useMemo(() => {
    const byDay = new Map<string, number>();
    for (const s of smokes) {
      byDay.set(s.localDate, (byDay.get(s.localDate) ?? 0) + 1);
    }
    const dayCounts = Array.from(byDay.values());
    const totalSmokes = smokes.length;
    const dailyAverage = dayCounts.length ? totalSmokes / dayCounts.length : 0;
    const dailyMax = dayCounts.length ? Math.max(...dayCounts) : 0;
    const dailyMin = dayCounts.length ? Math.min(...dayCounts) : 0;

    // Tek, gerçek bir versiyon: tüm zaman çizelgesi, gece boyunca geçen süre
    // dahil (gün ayrımı yapılmaz — gerçekte sigaralar arasında ne kadar süre
    // geçtiği önemlidir, saat kaç olduğu değil).
    const sortedSmokes = [...smokes].sort((a, b) => a.timestamp - b.timestamp);
    const lastSmoke = sortedSmokes[sortedSmokes.length - 1] as
      | (typeof sortedSmokes)[number]
      | undefined;
    const openGapMinutes = lastSmoke ? (now - lastSmoke.timestamp) / 60000 : null;

    const intervals = calculateSmokingIntervals(sortedSmokes.map((s) => s.timestamp));
    // "En uzun sigarasız süre", son sigaradan bu yana süren (henüz bir
    // sonraki sigarayla kapanmamış) açık boşluğu da aday olarak sayar.
    const intervalsWithOpenGap =
      openGapMinutes !== null ? [...intervals, openGapMinutes] : intervals;

    const totalCost = ledgerEntries.reduce(
      (sum, e) => sum + e.consumption * costPerCigarette,
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

    const reasonBreakdown = calculateReasonBreakdown(smokes);
    const reasonInsight = buildReasonInsight(reasonBreakdown);

    return {
      totalSmokes,
      dailyAverage,
      dailyAverageCost: dailyAverage * costPerCigarette,
      dailyMax,
      dailyMin,
      averageInterval: calculateAverageInterval(intervals),
      longestGap: calculateLongestSmokeFreeInterval(intervalsWithOpenGap),
      totalCost,
      chartData,
      reasonBreakdown,
      reasonInsight,
    };
  }, [smokes, ledgerEntries, costPerCigarette, now]);
}
