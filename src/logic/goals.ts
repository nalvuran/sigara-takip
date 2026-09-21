import { dateDiffInDays } from "./dateUtils";

export interface Goal {
  startDate: string; // "YYYY-MM-DD"
  startLimit: number;
  targetLimit: number;
  targetDate: string | null; // null = tarihsiz, sadece limit hedefi
}

export interface GoalProgress {
  daysElapsed: number;
  daysTotal: number | null; // targetDate yoksa null
  expectedLimit: number | null; // o güne kadar "olması gereken" limit (lineer enterpolasyon)
  percentComplete: number | null; // 0-100, targetDate yoksa null
  isAheadOrOnTrack: boolean | null; // mevcut limit, beklenenden düşük/eşitse true
}

/**
 * Hedefe doğru ilerlemeyi hesaplar. Başlangıç limiti ile hedef limit arasında
 * tarihe göre lineer bir "beklenen limit" çizgisi varsayar.
 */
export function calculateGoalProgress(
  goal: Goal,
  currentLimit: number,
  today: string
): GoalProgress {
  const daysElapsed = Math.max(0, dateDiffInDays(today, goal.startDate));

  if (!goal.targetDate) {
    return {
      daysElapsed,
      daysTotal: null,
      expectedLimit: null,
      percentComplete: null,
      isAheadOrOnTrack: currentLimit <= goal.startLimit ? true : null,
    };
  }

  const daysTotal = Math.max(1, dateDiffInDays(goal.targetDate, goal.startDate));
  const clampedElapsed = Math.min(daysElapsed, daysTotal);
  const progressRatio = clampedElapsed / daysTotal;

  const expectedLimit =
    goal.startLimit + (goal.targetLimit - goal.startLimit) * progressRatio;

  const percentComplete = Math.min(100, Math.round(progressRatio * 100));

  // Limit düşürme hedefinde "düşük limit" iyidir; mevcut limit beklenenden
  // küçük veya eşitse hedefin ilerisinde/üzerinde demektir.
  const isAheadOrOnTrack = currentLimit <= Math.ceil(expectedLimit);

  return { daysElapsed, daysTotal, expectedLimit, percentComplete, isAheadOrOnTrack };
}

/**
 * Belirli bir günün "hedefe uygun" sayılıp sayılmadığı: o günkü tüketim,
 * o günkü temel limitin altında veya eşit mi.
 */
export interface DayAdherence {
  date: string;
  metLimit: boolean;
}

export function buildAdherence(
  days: { date: string; baseLimit: number; consumption: number }[]
): DayAdherence[] {
  return days.map((d) => ({
    date: d.date,
    metLimit: d.consumption <= d.baseLimit,
  }));
}

/**
 * En güncel günden geriye doğru, kesintisiz "limit altında kalınan" gün sayısı.
 * `days` kronolojik sırada (eskiden yeniye) verilmelidir.
 */
export function calculateCurrentStreak(
  days: { date: string; baseLimit: number; consumption: number }[]
): number {
  const adherence = buildAdherence(days);
  let streak = 0;
  for (let i = adherence.length - 1; i >= 0; i--) {
    if (adherence[i].metLimit) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/** Tüm zamanların en uzun kesintisiz "limit altında kalma" serisi. */
export function calculateLongestStreak(
  days: { date: string; baseLimit: number; consumption: number }[]
): number {
  const adherence = buildAdherence(days);
  let longest = 0;
  let current = 0;
  for (const day of adherence) {
    if (day.metLimit) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return longest;
}
