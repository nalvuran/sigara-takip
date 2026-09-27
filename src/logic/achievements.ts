import { SMOKE_REASONS } from "./reasons";
import { getLocalHour, isLocalWeekend, toLocalDateString } from "./dateUtils";
import { calculateSmokingIntervals, calculateLongestSmokeFreeInterval } from "./allowance";

/**
 * BAŞARILAR — TASARIM İLKESİ
 * ---------------------------
 * Bu rozetlerin hiçbiri "daha az iç", "hedefe ulaştın", "para biriktirdin"
 * gibi azaltma/performans mesajı vermez. Amaç kullanıcıyı bir yöne itmek
 * değil, uygulamayla ve kendi verisiyle ilişkisini nötr biçimde yansıtmaktır.
 * Dört kategori:
 *   1) Sadakat     - uygulamayı kullanma (tüketim miktarından bağımsız)
 *   2) Farkındalık - kendi verisiyle/sebepleriyle tanışma
 *   3) Keşif       - uygulamanın ekranlarını keşfetme
 *   4) Eğlenceli   - yargısız, nötr gözlemler (gece kuşu, hafta sonu vb.)
 */

export interface AchievementFlags {
  hasUsedUndo?: boolean;
  hasSetReason?: boolean;
  hasViewedStats?: boolean;
  hasViewedHistory?: boolean;
  hasViewedSettings?: boolean;
  hasViewedAchievements?: boolean;
}

export interface AchievementInput {
  totalRecords: number;
  totalDaysTracked: number;
  distinctReasonsUsed: number;
  nightOwl: boolean; // 00:00-05:00 arası en az 1 kayıt
  earlyBird: boolean; // 05:00-08:00 arası en az 1 kayıt
  weekendRecords: number;
  longestGapMinutes: number | null;
  maxSameHourDays: number; // aynı saat diliminde kayıt yapılan farklı gün sayısı
  flags: Required<AchievementFlags>;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: "sadakat" | "farkindalik" | "kesif" | "eglenceli";
  isUnlocked: (input: AchievementInput) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  // 1) Sadakat
  {
    id: "ilk_kayit",
    title: "İlk Adım",
    description: "İlk sigara kaydını oluşturdun.",
    icon: "👣",
    category: "sadakat",
    isUnlocked: (i) => i.totalRecords >= 1,
  },
  {
    id: "gunler_7",
    title: "1 Hafta Burada",
    description: "7 gün boyunca uygulamayı kullandın.",
    icon: "📅",
    category: "sadakat",
    isUnlocked: (i) => i.totalDaysTracked >= 7,
  },
  {
    id: "gunler_30",
    title: "1 Ay Burada",
    description: "30 gün boyunca uygulamayı kullandın.",
    icon: "🗓️",
    category: "sadakat",
    isUnlocked: (i) => i.totalDaysTracked >= 30,
  },
  {
    id: "gunler_100",
    title: "100 Gün Burada",
    description: "100 gün boyunca uygulamayı kullandın.",
    icon: "📖",
    category: "sadakat",
    isUnlocked: (i) => i.totalDaysTracked >= 100,
  },
  {
    id: "gunler_200",
    title: "Uzun Soluklu",
    description: "200 gün boyunca uygulamayı kullandın.",
    icon: "🌳",
    category: "sadakat",
    isUnlocked: (i) => i.totalDaysTracked >= 200,
  },
  {
    id: "toparlayici",
    title: "Toparlayıcı",
    description: "Bir kaydı geri aldın — hata yapmak gayet normal.",
    icon: "↩️",
    category: "sadakat",
    isUnlocked: (i) => i.flags.hasUsedUndo,
  },

  // 2) Farkındalık
  {
    id: "ilk_neden",
    title: "İlk Neden",
    description: "İlk kez bir içme sebebi seçtin.",
    icon: "💭",
    category: "farkindalik",
    isUnlocked: (i) => i.flags.hasSetReason,
  },
  {
    id: "oruntu_kasifi",
    title: "Örüntü Kâşifi",
    description: "Beş farklı sebebin hepsini en az bir kez seçtin.",
    icon: "🧭",
    category: "farkindalik",
    isUnlocked: (i) => i.distinctReasonsUsed >= SMOKE_REASONS.length,
  },
  {
    id: "kayit_50",
    title: "50 Kayıt",
    description: "Uygulamada 50 kayıt biriktirdin.",
    icon: "🔢",
    category: "farkindalik",
    isUnlocked: (i) => i.totalRecords >= 50,
  },
  {
    id: "kayit_100",
    title: "100 Kayıt",
    description: "Uygulamada 100 kayıt biriktirdin.",
    icon: "💯",
    category: "farkindalik",
    isUnlocked: (i) => i.totalRecords >= 100,
  },
  {
    id: "kayit_500",
    title: "500 Kayıt",
    description: "Uygulamada 500 kayıt biriktirdin.",
    icon: "📊",
    category: "farkindalik",
    isUnlocked: (i) => i.totalRecords >= 500,
  },
  {
    id: "kayit_1000",
    title: "Kayıt Ustası",
    description: "Uygulamada 1000 kayıt biriktirdin.",
    icon: "🗂️",
    category: "farkindalik",
    isUnlocked: (i) => i.totalRecords >= 1000,
  },

  // 3) Keşif
  {
    id: "ilk_bakis",
    title: "İlk Bakış",
    description: "İstatistikler ekranını ilk kez açtın.",
    icon: "🔍",
    category: "kesif",
    isUnlocked: (i) => i.flags.hasViewedStats,
  },
  {
    id: "gecmisini_gordun",
    title: "Geçmişini Gördün",
    description: "Geçmiş ekranını ilk kez açtın.",
    icon: "🕰️",
    category: "kesif",
    isUnlocked: (i) => i.flags.hasViewedHistory,
  },
  {
    id: "ayarlari_kesfettin",
    title: "Ayarları Keşfettin",
    description: "Ayarlar ekranını ilk kez açtın.",
    icon: "🔧",
    category: "kesif",
    isUnlocked: (i) => i.flags.hasViewedSettings,
  },
  {
    id: "rozet_avcisi",
    title: "Rozet Avcısı",
    description: "Başarılar ekranını ilk kez açtın.",
    icon: "🗝️",
    category: "kesif",
    isUnlocked: (i) => i.flags.hasViewedAchievements,
  },

  // 4) Eğlenceli / nötr gözlemler
  {
    id: "gece_kusu",
    title: "Gece Kuşu",
    description: "Gece yarısı ile sabah 05:00 arasında bir kayıt oluşturdun.",
    icon: "🦉",
    category: "eglenceli",
    isUnlocked: (i) => i.nightOwl,
  },
  {
    id: "sabah_insani",
    title: "Sabah İnsanı",
    description: "Sabah 05:00-08:00 arasında bir kayıt oluşturdun.",
    icon: "🌅",
    category: "eglenceli",
    isUnlocked: (i) => i.earlyBird,
  },
  {
    id: "hafta_sonu_modu",
    title: "Hafta Sonu Modu",
    description: "Hafta sonları en az 5 kayıt oluşturdun.",
    icon: "🎉",
    category: "eglenceli",
    isUnlocked: (i) => i.weekendRecords >= 5,
  },
  {
    id: "sessiz_saatler",
    title: "Sessiz Saatler",
    description: "Kayıtların arasında 6 saatten uzun bir sessizlik oldu.",
    icon: "🌙",
    category: "eglenceli",
    isUnlocked: (i) => (i.longestGapMinutes ?? 0) >= 360,
  },
  {
    id: "ritmin_var",
    title: "Ritmin Var",
    description: "Beş farklı günde aynı saat diliminde kayıt oluşturdun.",
    icon: "🔁",
    category: "eglenceli",
    isUnlocked: (i) => i.maxSameHourDays >= 5,
  },
];

export function evaluateAchievements(input: AchievementInput) {
  return ACHIEVEMENTS.map((a) => ({
    ...a,
    unlocked: a.isUnlocked(input),
  }));
}

/**
 * Ham sigara kayıtları + gün sayısı + bayraklardan, evaluateAchievements'ın
 * ihtiyaç duyduğu girdiyi hesaplar. Bu fonksiyon saf değildir sayılmaz aslında
 * (yan etkisi yok, sadece dönüştürür) — test edilebilir.
 */
export function computeAchievementInput(
  smokes: { timestamp: number; reason?: string | null }[],
  totalDaysTracked: number,
  flags: AchievementFlags
): AchievementInput {
  const totalRecords = smokes.length;

  const distinctReasons = new Set(
    smokes
      .map((s) => s.reason)
      .filter(
        (r): r is string => !!r && SMOKE_REASONS.some((def) => def.id === r)
      )
  );

  const nightOwl = smokes.some((s) => {
    const h = getLocalHour(s.timestamp);
    return h >= 0 && h < 5;
  });

  const earlyBird = smokes.some((s) => {
    const h = getLocalHour(s.timestamp);
    return h >= 5 && h < 8;
  });

  const weekendRecords = smokes.filter((s) => isLocalWeekend(s.timestamp)).length;

  const sortedTimestamps = smokes.map((s) => s.timestamp).sort((a, b) => a - b);
  const intervals = calculateSmokingIntervals(sortedTimestamps);
  const longestGapMinutes = calculateLongestSmokeFreeInterval(intervals);

  const hourDayMap = new Map<number, Set<string>>();
  for (const s of smokes) {
    const hour = getLocalHour(s.timestamp);
    const date = toLocalDateString(s.timestamp);
    const set = hourDayMap.get(hour) ?? new Set<string>();
    set.add(date);
    hourDayMap.set(hour, set);
  }
  let maxSameHourDays = 0;
  for (const set of hourDayMap.values()) {
    maxSameHourDays = Math.max(maxSameHourDays, set.size);
  }

  return {
    totalRecords,
    totalDaysTracked,
    distinctReasonsUsed: distinctReasons.size,
    nightOwl,
    earlyBird,
    weekendRecords,
    longestGapMinutes,
    maxSameHourDays,
    flags: {
      hasUsedUndo: !!flags.hasUsedUndo,
      hasSetReason: !!flags.hasSetReason,
      hasViewedStats: !!flags.hasViewedStats,
      hasViewedHistory: !!flags.hasViewedHistory,
      hasViewedSettings: !!flags.hasViewedSettings,
      hasViewedAchievements: !!flags.hasViewedAchievements,
    },
  };
}
