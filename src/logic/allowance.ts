/**
 * Hak/Devir (Allowance & Rollover) Motoru
 * ----------------------------------------
 * Bu dosya UI'dan tamamen bağımsız, saf (pure) fonksiyonlar içerir.
 * Formül (spesifikasyon bölüm 6):
 *
 *   allowance(day)  = baseLimit(day) + previousDayRemaining
 *   remaining(day)  = allowance(day) - consumption(day)
 *
 * remaining pozitifse ertesi güne devreder (birikir),
 * negatifse ertesi günün hakkından borç olarak düşülür.
 */

export interface DayInput {
  date: string; // "YYYY-MM-DD"
  baseLimit: number; // o gün geçerli temel limit
  consumption: number; // o gün içilen sigara sayısı
}

export interface DayResult {
  date: string;
  baseLimit: number;
  previousRemaining: number;
  allowance: number;
  consumption: number;
  remaining: number;
}

/** allowance(day) = baseLimit + previousDayRemaining */
export function calculateDailyAllowance(
  baseLimit: number,
  previousDayRemaining: number
): number {
  return baseLimit + previousDayRemaining;
}

/** remaining(day) = allowance - consumption (negatif olabilir) */
export function calculateRemainingAllowance(
  allowance: number,
  consumption: number
): number {
  return allowance - consumption;
}

/**
 * Bir günün remaining değeri, ertesi güne "previousDayRemaining" olarak taşınır.
 * Ayrı bir isimle tutuyoruz çünkü ileride (örn. haftalık sıfırlama, tavan/taban limiti)
 * farklı bir devir kuralı eklenmek istenirse tek noktadan değiştirilebilsin.
 */
export function calculateRollover(remaining: number): number {
  return remaining;
}

/**
 * Bir gün dizisini (baştan bugüne kadar, kronolojik sırayla) işleyip
 * her gün için allowance/remaining zincirini hesaplar.
 *
 * @param days kronolojik sırada günlük veriler
 * @param startingRemaining zincirin başındaki (ilk günden önceki) devreden hak; yoksa 0
 */
export function buildDailyLedger(
  days: DayInput[],
  startingRemaining = 0
): DayResult[] {
  const results: DayResult[] = [];
  let previousRemaining = startingRemaining;

  for (const day of days) {
    const allowance = calculateDailyAllowance(day.baseLimit, previousRemaining);
    const remaining = calculateRemainingAllowance(allowance, day.consumption);

    results.push({
      date: day.date,
      baseLimit: day.baseLimit,
      previousRemaining,
      allowance,
      consumption: day.consumption,
      remaining,
    });

    previousRemaining = calculateRollover(remaining);
  }

  return results;
}

/** O gün için geçerli temel limiti, limit değişiklik geçmişinden bulur. */
export function resolveBaseLimitForDate(
  date: string,
  defaultLimit: number,
  limitHistory: { newLimit: number; effectiveFrom: string }[]
): number {
  // effectiveFrom <= date olan en yakın (en yeni) değişikliği bul
  const applicable = limitHistory
    .filter((c) => c.effectiveFrom <= date)
    .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1));

  return applicable.length > 0 ? applicable[0].newLimit : defaultLimit;
}

/** Sigara başına maliyet: packagePrice / cigarettesPerPack */
export function calculateCostPerCigarette(
  packagePrice: number,
  cigarettesPerPack: number
): number {
  if (cigarettesPerPack <= 0) return 0;
  return packagePrice / cigarettesPerPack;
}

/** Günlük harcama = içilen sigara sayısı × sigara başı fiyat */
export function calculateDailyCost(
  consumption: number,
  costPerCigarette: number
): number {
  return Math.max(0, consumption) * costPerCigarette;
}

/**
 * İçilmeyen sigaraların parasal değeri.
 * Sadece o günün TEMEL limitine göre hesaplanır (allowance'a göre değil),
 * çünkü "tasarruf" kavramı kullanıcının temel alışkanlığına kıyasla anlamlıdır.
 * Negatifse (limit aşıldıysa) 0 döner - tasarruf yok, ceza da gösterilmez (nötr dil).
 */
export function calculateSavings(
  baseLimit: number,
  consumption: number,
  costPerCigarette: number
): number {
  const unsmoked = Math.max(0, baseLimit - consumption);
  return unsmoked * costPerCigarette;
}

/**
 * Ardışık sigara timestamp'lerinden (epoch ms, artan sırada) aralıkları
 * dakika cinsinden hesaplar.
 */
export function calculateSmokingIntervals(timestampsMs: number[]): number[] {
  const sorted = [...timestampsMs].sort((a, b) => a - b);
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    intervals.push((sorted[i] - sorted[i - 1]) / 60000);
  }
  return intervals;
}

export function calculateAverageInterval(
  intervalsMinutes: number[]
): number | null {
  if (intervalsMinutes.length === 0) return null;
  const sum = intervalsMinutes.reduce((a, b) => a + b, 0);
  return sum / intervalsMinutes.length;
}

export function calculateLongestSmokeFreeInterval(
  intervalsMinutes: number[]
): number | null {
  if (intervalsMinutes.length === 0) return null;
  return Math.max(...intervalsMinutes);
}

/** Dakikayı "Xs Ydk" biçiminde okunabilir metne çevirir. */
export function formatMinutesAsDuration(totalMinutes: number): string {
  const mins = Math.round(totalMinutes);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m}dk`;
  return `${h}s ${m}dk`;
}
