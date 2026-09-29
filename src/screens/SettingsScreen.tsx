import { useState, type PropsWithChildren } from "react";
import { useAuth } from "../hooks/useAuth";
import { useUserSettings } from "../hooks/useUserSettings";
import {
  updateUserSettings,
  changeDailyLimit,
  resetAllUserData,
} from "../services/firestoreService";
import { logOut } from "../services/authService";
import { PrimaryButton, GhostButton, DangerButton, Switch, SectionLabel, Divider } from "../components/ui";
import { addDaysToDateString, todayLocalDateString } from "../logic/dateUtils";
import { calculateCostPerCigarette } from "../logic/allowance";

function Group({ children }: PropsWithChildren) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
      {children}
    </div>
  );
}

function Row({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return <div className={`px-4 py-3.5 ${className}`}>{children}</div>;
}

export function SettingsScreen() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const settings = useUserSettings(uid);

  const [limitInput, setLimitInput] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [countInput, setCountInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  if (!settings) {
    return (
      <div className="max-w-xl mx-auto px-6 pt-14 sm:pt-32">
        <p className="text-[var(--ink-soft)]">Yükleniyor…</p>
      </div>
    );
  }

  const costPerCigarette = calculateCostPerCigarette(
    settings.packagePrice,
    settings.cigarettesPerPack
  );

  async function handleLimitSave() {
    const value = Number(limitInput);
    if (!Number.isFinite(value) || value <= 0) {
      setMessage("Geçerli bir günlük limit girin (0'dan büyük).");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const effectiveFrom = addDaysToDateString(todayLocalDateString(), 1);
      await changeDailyLimit(uid!, value, effectiveFrom);
      setLimitInput("");
      setMessage(`Yeni limit (${value}) yarından itibaren geçerli olacak.`);
    } catch (e) {
      setMessage("Limit güncellenemedi, tekrar deneyin.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePackageSave() {
    const price = priceInput ? Number(priceInput) : settings!.packagePrice;
    const count = countInput ? Number(countInput) : settings!.cigarettesPerPack;
    if (!Number.isFinite(price) || price < 0 || !Number.isFinite(count) || count <= 0) {
      setMessage("Geçerli bir paket fiyatı ve adedi girin.");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await updateUserSettings(uid!, { packagePrice: price, cigarettesPerPack: count });
      setPriceInput("");
      setCountInput("");
      setMessage("Paket bilgileri güncellendi.");
    } catch {
      setMessage("Güncellenemedi, tekrar deneyin.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleDarkMode(next: boolean) {
    try {
      await updateUserSettings(uid!, { darkMode: next });
    } catch {
      setMessage("Tema değiştirilemedi, tekrar deneyin.");
    }
  }

  async function handleReset() {
    setResetting(true);
    try {
      await resetAllUserData(uid!);
      setConfirmingReset(false);
      setMessage("Tüm veriler sıfırlandı.");
    } catch {
      setMessage("Sıfırlama sırasında bir hata oluştu.");
    } finally {
      setResetting(false);
    }
  }

  const inputClass =
    "w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-3)] outline-none focus:ring-1 focus:ring-[var(--accent)] text-[14px]";

  return (
    <div className="max-w-xl mx-auto px-6 pt-14 pb-32 sm:pt-32">
      <h1 className="font-serif-display text-[34px] text-[var(--ink)] mb-9 leading-none">
        Ayarlar
      </h1>

      {message && (
        <p className="text-[13px] text-[var(--ink-soft)] mb-6 -mt-4">{message}</p>
      )}

      <div className="space-y-8">
        {/* GÜNLÜK */}
        <div>
          <SectionLabel>Günlük</SectionLabel>
          <Group>
            <Row className="flex items-center justify-between">
              <span className="text-[14px] text-[var(--ink)]">Günlük temel limit</span>
              <span className="text-[14px] font-medium tabular-nums">{settings.dailyLimit}</span>
            </Row>
            <Divider />
            <Row>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  placeholder="Yeni değer"
                  value={limitInput}
                  onChange={(e) => setLimitInput(e.target.value)}
                  className={inputClass}
                />
                <PrimaryButton onClick={handleLimitSave} disabled={saving} className="px-5 text-[14px]">
                  Kaydet
                </PrimaryButton>
              </div>
              <p className="text-[11px] text-[var(--ink-faint)] mt-2">
                Değişiklik yarından itibaren geçerli olur, geçmiş günler etkilenmez.
              </p>
            </Row>
          </Group>
        </div>

        {/* PAKET */}
        <div>
          <SectionLabel>Paket</SectionLabel>
          <Group>
            <Row className="flex items-center justify-between">
              <span className="text-[14px] text-[var(--ink)]">Paket / adet / sigara başı</span>
              <span className="text-[14px] font-medium tabular-nums">
                {settings.packagePrice}₺ / {settings.cigarettesPerPack} / {costPerCigarette.toFixed(2)}₺
              </span>
            </Row>
            <Divider />
            <Row>
              <div className="flex gap-2 mb-3">
                <input
                  type="number"
                  min={0}
                  placeholder={`Fiyat (${settings.packagePrice})`}
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  className={inputClass}
                />
                <input
                  type="number"
                  min={1}
                  placeholder={`Adet (${settings.cigarettesPerPack})`}
                  value={countInput}
                  onChange={(e) => setCountInput(e.target.value)}
                  className={inputClass}
                />
              </div>
              <PrimaryButton onClick={handlePackageSave} disabled={saving} className="w-full py-2.5 text-[14px]">
                Kaydet
              </PrimaryButton>
            </Row>
          </Group>
        </div>

        {/* GÖRÜNÜM */}
        <div>
          <SectionLabel>Görünüm</SectionLabel>
          <Group>
            <Row className="flex items-center justify-between">
              <span className="text-[14px] text-[var(--ink)]">Karanlık mod</span>
              <Switch
                checked={!!settings.darkMode}
                onChange={handleToggleDarkMode}
                label="Karanlık modu aç/kapat"
              />
            </Row>
          </Group>
        </div>

        {/* HESAP */}
        <div>
          <SectionLabel>Hesap</SectionLabel>
          <Group>
            <Row>
              <p className="text-[13px] text-[var(--ink-faint)]">{user?.email}</p>
            </Row>
            <Divider />
            <button onClick={() => logOut()} className="w-full text-left">
              <Row>
                <span className="text-[14px] text-[var(--ink)]">Çıkış yap</span>
              </Row>
            </button>
          </Group>
        </div>

        {/* VERİ */}
        <div>
          <SectionLabel>Veri</SectionLabel>
          <Group>
            {!confirmingReset ? (
              <button onClick={() => setConfirmingReset(true)} className="w-full text-left">
                <Row>
                  <span className="text-[14px] text-[var(--danger)]">Tüm verileri sıfırla</span>
                </Row>
              </button>
            ) : (
              <Row>
                <p className="text-[13px] leading-relaxed text-[var(--ink-soft)] mb-3">
                  Tüm sigara geçmişin, istatistiklerin ve günlük hak geçmişin silinecek. Günlük
                  limit, paket fiyatı ve hesabın korunur. Bu işlem geri alınamaz.
                </p>
                <div className="flex gap-2">
                  <GhostButton
                    onClick={() => setConfirmingReset(false)}
                    className="flex-1 py-2.5 text-[14px]"
                    disabled={resetting}
                  >
                    Vazgeç
                  </GhostButton>
                  <DangerButton onClick={handleReset} className="flex-1 py-2.5 text-[14px]" disabled={resetting}>
                    {resetting ? "Siliniyor…" : "Evet, sıfırla"}
                  </DangerButton>
                </div>
              </Row>
            )}
          </Group>
        </div>
      </div>
    </div>
  );
}
