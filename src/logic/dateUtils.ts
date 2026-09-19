/**
 * Tarih/saat yardımcıları.
 * Sunucu/istemci UTC kullanabilir; kullanıcıya gösterilen ve "gün" belirleyen
 * her şey Europe/Istanbul saat dilimine göre hesaplanır.
 *
 * İleride kullanıcının "gün başlangıç saati" ayarlanabilir hale getirilebilmesi
 * için tüm fonksiyonlar bir `dayStartHour` parametresi kabul eder (varsayılan 0,
 * yani 00:00-23:59 gün tanımı).
 */

const TIMEZONE = "Europe/Istanbul";

/** Verilen epoch ms zamanını Europe/Istanbul gününe göre "YYYY-MM-DD" olarak döndürür. */
export function toLocalDateString(
  epochMs: number,
  dayStartHour = 0
): string {
  const shifted = epochMs - dayStartHour * 3600 * 1000;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // en-CA locale -> YYYY-MM-DD formatını doğrudan verir
  return formatter.format(new Date(shifted));
}

/** Europe/Istanbul saatine göre saat:dakika metni (örn. "14:08"). */
export function toLocalTimeString(epochMs: number): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(epochMs));
}

/** Europe/Istanbul saatine göre "18 Eylül" gibi gün başlığı. */
export function toLocalDayHeading(epochMs: number): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: TIMEZONE,
    day: "numeric",
    month: "long",
  }).format(new Date(epochMs));
}

/** Şu anki zamanın Europe/Istanbul "YYYY-MM-DD" karşılığı. */
export function todayLocalDateString(dayStartHour = 0): string {
  return toLocalDateString(Date.now(), dayStartHour);
}

/** İki "YYYY-MM-DD" tarihi arasındaki gün farkını hesaplar (a - b). */
export function dateDiffInDays(a: string, b: string): number {
  const da = new Date(a + "T00:00:00Z").getTime();
  const db = new Date(b + "T00:00:00Z").getTime();
  return Math.round((da - db) / (24 * 3600 * 1000));
}

/** Bir "YYYY-MM-DD" tarihine gün ekler/çıkarır, yeni "YYYY-MM-DD" döner. */
export function addDaysToDateString(date: string, days: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Verilen "YYYY-MM-DD" tarihinden bugüne kadar (dahil) kronolojik tarih listesi üretir. */
export function dateRangeUntilToday(
  startDate: string,
  dayStartHour = 0
): string[] {
  const today = todayLocalDateString(dayStartHour);
  const days: string[] = [];
  let cursor = startDate;
  // güvenlik: sonsuz döngü olmaması için üst sınır
  let guard = 0;
  while (cursor <= today && guard < 20000) {
    days.push(cursor);
    cursor = addDaysToDateString(cursor, 1);
    guard++;
  }
  return days;
}

/** Milisaniyeyi "X saat Y dakika" biçiminde okunabilir metne çevirir (canlı sayaç için). */
export function formatElapsedSince(epochMs: number, nowMs: number): string {
  const diffMinutes = Math.max(0, Math.floor((nowMs - epochMs) / 60000));
  const h = Math.floor(diffMinutes / 60);
  const m = diffMinutes % 60;
  if (h <= 0) return `${m} dakika önce`;
  return `${h} saat ${m} dakika önce`;
}
