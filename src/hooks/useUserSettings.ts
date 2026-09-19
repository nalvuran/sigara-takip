import { useEffect, useState } from "react";
import type { UserSettings } from "../types";
import { subscribeUserSettings } from "../services/firestoreService";

export function useUserSettings(uid: string | null) {
  const [settings, setSettings] = useState<UserSettings | null>(null);

  useEffect(() => {
    if (!uid) return;
    return subscribeUserSettings(uid, setSettings);
  }, [uid]);

  return settings;
}
