import { useEffect, useState } from "react";
import { subscribeFlags } from "../services/firestoreService";

export function useFlags(uid: string | null) {
  const [flags, setFlags] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!uid) return;
    setFlags({});
    return subscribeFlags(uid, setFlags);
  }, [uid]);

  return { flags };
}
