import { useEffect, useState } from "react";
import type { DailyLedgerEntry, UserSettings } from "../types";
import {
  subscribeLedgerEntry,
  subscribeLimitHistory,
  addSmoke,
  undoSmoke,
  ensureTodayLedger,
} from "../services/firestoreService";
import { todayLocalDateString } from "../logic/dateUtils";
import { resolveBaseLimitForDate } from "../logic/allowance";

/**
 * Bugünün ledger kaydını canlı olarak takip eder. Gün Europe/Istanbul'a göre
 * değiştiğinde (kullanıcı uygulamayı açık bırakmışsa) otomatik olarak yeni
 * güne geçer - her dakika "bugün nedir" kontrolü yapılır.
 */
export function useTodayLedger(uid: string | null, settings: UserSettings | null) {
  const [today, setToday] = useState(todayLocalDateString());
  const [entry, setEntry] = useState<DailyLedgerEntry | null>(null);
  const [limitHistory, setLimitHistory] = useState<
    { newLimit: number; effectiveFrom: string }[]
  >([]);

  // Gün değişimini yakalamak için periyodik kontrol.
  useEffect(() => {
    const interval = setInterval(() => {
      const current = todayLocalDateString();
      setToday((prev) => (prev !== current ? current : prev));
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!uid) return;
    return subscribeLimitHistory(uid, setLimitHistory);
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    setEntry(null);
    return subscribeLedgerEntry(uid, today, setEntry);
  }, [uid, today]);

  const baseLimit = settings
    ? resolveBaseLimitForDate(today, settings.dailyLimit, limitHistory)
    : 10;

  // Kullanıcı o gün hiç sigara eklemese bile ledger zincirinin kopmaması için
  // her gün (ve gün değişiminde) günün kaydını proaktif olarak oluştur.
  useEffect(() => {
    if (!uid || !settings) return;
    ensureTodayLedger(uid, today, baseLimit).catch(() => {
      // Sessizce yut: geçici ağ hatası olursa bir sonraki tetiklemede tekrar denenir.
    });
  }, [uid, today, baseLimit, settings]);

  async function smoke(): Promise<string | undefined> {
    if (!uid) return undefined;
    return addSmoke(uid, baseLimit);
  }

  async function undo(smokeId: string) {
    if (!uid) return;
    await undoSmoke(uid, smokeId);
  }

  return { today, entry, baseLimit, smoke, undo };
}
