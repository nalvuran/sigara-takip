// Kullanıcı ayarları (users/{userId})
export interface UserSettings {
  dailyLimit: number;
  cigarettesPerPack: number;
  packagePrice: number;
  createdAt: number; // epoch ms
  updatedAt: number;
}

// Tek bir sigara kaydı (users/{userId}/smokes/{smokeId})
export interface SmokeRecord {
  id: string;
  timestamp: number; // epoch ms
  localDate: string; // "YYYY-MM-DD" (Europe/Istanbul gününe göre)
  createdAt: number;
}

// Günlük hak devri kaydı (users/{userId}/dailyLedger/{date})
export interface DailyLedgerEntry {
  date: string; // "YYYY-MM-DD"
  baseLimit: number; // o gün geçerli olan temel limit
  previousRemaining: number; // önceki günden devreden hak (negatif olabilir)
  allowance: number; // baseLimit + previousRemaining
  consumption: number; // o gün içilen sigara sayısı
  remaining: number; // allowance - consumption (ertesi güne devreder)
  isFinalized: boolean; // gün kapandı mı (geçmiş günler finalize, bugün değil)
  updatedAt: number;
}

// Limit değişikliği geçmişi (users/{userId}/limitHistory/{changeId})
export interface LimitChange {
  id: string;
  newLimit: number;
  effectiveFrom: string; // "YYYY-MM-DD" - bu tarihten itibaren geçerli
  createdAt: number;
}

export interface DailyStats {
  date: string;
  totalSmokes: number;
  intervals: number[]; // dakika cinsinden ardışık sigaralar arası süreler
  averageIntervalMinutes: number | null;
  cost: number;
}
