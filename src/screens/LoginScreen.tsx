import { useState } from "react";
import {
  signIn,
  signUp,
  signInWithGoogle,
  friendlyAuthError,
} from "../services/authService";
import { PrimaryButton, GhostButton } from "../components/ui";

export function LoginScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError("E-posta ve şifre gerekli.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-5 bg-[var(--bg)]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="font-serif-display text-[40px] text-[var(--accent)] leading-none mb-4">
            Ayna
          </div>
          <h1 className="text-[22px] font-medium text-[var(--ink)]">Sigara Takip</h1>
          <p className="text-[var(--ink-soft)] text-[14px] mt-1.5">
            Günlük hakkını takip et, yargısız.
          </p>
        </div>

        <div className="border border-[var(--border)] rounded-2xl p-6 bg-[var(--surface)]">
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              placeholder="E-posta"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-[var(--surface-3)] outline-none focus:ring-2 focus:ring-[var(--accent)] text-[15px]"
              autoComplete="email"
            />
            <input
              type="password"
              placeholder="Şifre"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-[var(--surface-3)] outline-none focus:ring-2 focus:ring-[var(--accent)] text-[15px]"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />

            {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

            <PrimaryButton type="submit" disabled={loading} className="w-full py-3 text-[15px]">
              {mode === "signin" ? "Giriş Yap" : "Hesap Oluştur"}
            </PrimaryButton>
          </form>

          <div className="flex items-center gap-3 my-4">
            <div className="h-px bg-[var(--divider)] flex-1" />
            <span className="text-xs text-[var(--ink-soft)]">veya</span>
            <div className="h-px bg-[var(--divider)] flex-1" />
          </div>

          <GhostButton onClick={handleGoogle} disabled={loading} className="w-full py-3 text-[15px]">
            Google ile devam et
          </GhostButton>
        </div>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="w-full text-center text-sm text-[var(--ink-soft)] mt-5"
        >
          {mode === "signin"
            ? "Hesabın yok mu? Kayıt ol"
            : "Zaten hesabın var mı? Giriş yap"}
        </button>
      </div>
    </div>
  );
}
