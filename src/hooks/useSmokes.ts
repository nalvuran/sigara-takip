import { useEffect, useState } from "react";
import type { SmokeRecord } from "../types";
import {
  subscribeSmokesForDate,
  subscribeSmokesRange,
} from "../services/firestoreService";

export function useSmokesForDate(uid: string | null, date: string) {
  const [smokes, setSmokes] = useState<SmokeRecord[]>([]);

  useEffect(() => {
    if (!uid) return;
    setSmokes([]);
    return subscribeSmokesForDate(uid, date, setSmokes);
  }, [uid, date]);

  return smokes;
}

export function useSmokesRange(
  uid: string | null,
  fromDate: string,
  toDate: string
) {
  const [smokes, setSmokes] = useState<SmokeRecord[]>([]);

  useEffect(() => {
    if (!uid) return;
    setSmokes([]);
    return subscribeSmokesRange(uid, fromDate, toDate, setSmokes);
  }, [uid, fromDate, toDate]);

  return smokes;
}
