import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { subscribeAuthState, completeRedirectSignIn } from "../services/authService";
import { ensureUserDocument } from "../services/firestoreService";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    completeRedirectSignIn();
    const unsubscribe = subscribeAuthState(async (u) => {
      if (u) {
        await ensureUserDocument(u.uid);
      }
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { user, loading };
}
