import { useState } from "react";
import {
  signIn,
  signUp,
  signInWithGoogle,
  friendlyAuthError,
} from "../services/authService";
import { PrimaryButton, GhostButton, Card } from "../components/ui";

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
    <div className="min-h-dvh flex items-center justify-center px-5 bg-[#fafafa]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🚬</div>
          <h1 className="text-2xl font-bold text-[#1f2328]">Sigara Takip</h1>
          <p className="text-[#6b7280] mt-1">
            Günlük hakkını takip et, yargısız.
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              placeholder="E-posta"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-[#f5f6f7] outline-none focus:ring-2 focus:ring-[#16a34a] text-[15px]"
              autoComplete="email"
            />
            <input
              type="password"
              placeholder="Şifre"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-[#f5f6f7] outline-none focus:ring-2 focus:ring-[#16a34a] text-[15px]"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />

            {error && <p className="text-sm text-[#dc2626]">{error}</p>}

            <PrimaryButton type="submit" disabled={loading} className="w-full py-3 text-[15px]">
              {mode === "signin" ? "Giriş Yap" : "Hesap Oluştur"}
            </PrimaryButton>
          </form>

          <div className="flex items-center gap-3 my-4">
            <div className="h-px bg-black/10 flex-1" />
            <span className="text-xs text-[#6b7280]">veya</span>
            <div className="h-px bg-black/10 flex-1" />
          </div>

          <GhostButton onClick={handleGoogle} disabled={loading} className="w-full py-3 text-[15px]">
            Google ile devam et
          </GhostButton>
        </Card>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="w-full text-center text-sm text-[#6b7280] mt-5"
        >
          {mode === "signin"
            ? "Hesabın yok mu? Kayıt ol"
            : "Zaten hesabın var mı? Giriş yap"}
        </button>
      </div>
    </div>
  );
}
