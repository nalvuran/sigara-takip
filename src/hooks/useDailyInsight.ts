import { useEffect, useRef, useState } from "react";
import {
  selectDailyInsight,
  type DailyInsight,
  type InsightSmoke,
} from "../logic/insights";
import { getStoredInsights, saveDailyInsight } from "../services/firestoreService";

/**
 * Günün yorum kartını verir. O gün için kayıtlı bir kart varsa onu gösterir;
 * yoksa geçmişte gösterilenlere bakarak tekrar etmeyecek yeni bir kart seçer,
 * kaydeder ve gösterir. Kayıt okunamaz/yazılamazsa (ör. izin yoksa) yine de,
 * yalnızca tarihe göre deterministik bir kart gösterilir.
 */
export function useDailyInsight(
  uid: string | null,
  smokes: InsightSmoke[],
  today: string
): DailyInsight | null {
  const [history, setHistory] = useState<DailyInsight[] | null>(null);
  const [insight, setInsight] = useState<DailyInsight | null>(null);
  const storageOk = useRef(true);
  const savedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    storageOk.current = true;
    getStoredInsights(uid)
      .then((h) => !cancelled && setHistory(h))
      .catch(() => {
        storageOk.current = false;
        if (!cancelled) setHistory([]);
      });
    return () => {
      cancelled = true;
    };
  }, [uid, today]);

  useEffect(() => {
    if (!uid || history === null) return;

    const stored = history.find((h) => h.date === today);
    if (stored) {
      setInsight(stored);
      return;
    }
    if (smokes.length === 0) return;

    const computed = selectDailyInsight(smokes, today, history);
    setInsight(computed);

    const key = `${uid}|${today}`;
    if (computed && storageOk.current && savedFor.current !== key) {
      savedFor.current = key;
      saveDailyInsight(uid, computed)
        .then((saved) =>
          setHistory((h) => [...(h ?? []).filter((x) => x.date !== today), saved])
        )
        .catch(() => {
          storageOk.current = false;
        });
    }
  }, [uid, history, smokes, today]);

  return insight;
}
