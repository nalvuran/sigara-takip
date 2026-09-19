import { useEffect, useState } from "react";
import type { DailyLedgerEntry } from "../types";
import { subscribeLedgerRange } from "../services/firestoreService";

export function useLedgerRange(
  uid: string | null,
  fromDate: string,
  toDate: string
) {
  const [entries, setEntries] = useState<DailyLedgerEntry[]>([]);

  useEffect(() => {
    if (!uid) return;
    setEntries([]);
    return subscribeLedgerRange(uid, fromDate, toDate, setEntries);
  }, [uid, fromDate, toDate]);

  return entries;
}
