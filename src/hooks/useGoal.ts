import { useEffect, useState } from "react";
import type { Goal } from "../types";
import { subscribeGoal, setGoal, clearGoal } from "../services/firestoreService";

export function useGoal(uid: string | null) {
  const [goal, setGoalState] = useState<Goal | null | undefined>(undefined);

  useEffect(() => {
    if (!uid) return;
    setGoalState(undefined);
    return subscribeGoal(uid, setGoalState);
  }, [uid]);

  async function saveGoal(
    targetLimit: number,
    targetDate: string | null,
    startLimit: number,
    startDate: string
  ) {
    if (!uid) return;
    await setGoal(uid, targetLimit, targetDate, startLimit, startDate);
  }

  async function removeGoal() {
    if (!uid) return;
    await clearGoal(uid);
  }

  return { goal, loading: goal === undefined, saveGoal, removeGoal };
}
