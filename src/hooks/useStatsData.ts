import { useMemo } from "react";
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

    // İki farklı bakış açısı karşılaştırma için yan yana tutuluyor:
    //  - günlük bazda: gece geçişleri katılmaz, sadece uyanıkken ki tempo/boşluk
    //  - gece dahil: tüm zaman çizelgesi, uyku boyunca geçen süre de dahil
    let allIntervals: number[] = [];
    const byDate = new Map<string, number[]>();
    for (const s of smokes) {
      const arr = byDate.get(s.localDate) ?? [];
      arr.push(s.timestamp);
      byDate.set(s.localDate, arr);
    }
    for (const list of byDate.values()) {
      allIntervals = allIntervals.concat(calculateSmokingIntervals(list));
    }

    const sortedTimestamps = [...smokes]
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((s) => s.timestamp);
    const overnightIntervals = calculateSmokingIntervals(sortedTimestamps);

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
      averageInterval: calculateAverageInterval(allIntervals),
      averageIntervalOvernight: calculateAverageInterval(overnightIntervals),
      longestGap: calculateLongestSmokeFreeInterval(allIntervals),
      longestGapOvernight: calculateLongestSmokeFreeInterval(overnightIntervals),
      totalCost,
      chartData,
      reasonBreakdown,
      reasonInsight,
    };
  }, [smokes, ledgerEntries, costPerCigarette]);
}
