import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useUserSettings } from "../hooks/useUserSettings";
import {
  updateUserSettings,
  changeDailyLimit,
  resetAllUserData,
} from "../services/firestoreService";
import { logOut } from "../services/authService";
import { Card, PrimaryButton, GhostButton, DangerButton } from "../components/ui";
import { addDaysToDateString, todayLocalDateString } from "../logic/dateUtils";
import { calculateCostPerCigarette } from "../logic/allowance";

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
      <div className="max-w-xl mx-auto px-5 pt-8 pb-28 sm:pt-28">
        <p className="text-[#6b7280]">Yükleniyor…</p>
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
      // Değişiklik yarından itibaren geçerli olur; bugünün ve geçmiş günlerin
      // hesaplamaları bozulmaz.
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

  return (
    <div className="max-w-xl mx-auto px-5 pt-8 pb-28 sm:pt-28 space-y-5">
      <h1 className="text-2xl font-bold">Ayarlar</h1>

      {message && (
        <div className="text-sm text-[#1f2328] bg-[#f1f2f4] rounded-2xl px-4 py-3">
          {message}
        </div>
      )}

      <Card>
        <h2 className="font-semibold mb-1">Günlük temel limit</h2>
        <p className="text-sm text-[#6b7280] mb-3">
          Şu an: <span className="font-semibold text-[#1f2328]">{settings.dailyLimit}</span> sigara/gün
        </p>
        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            placeholder="Örn. 8"
            value={limitInput}
            onChange={(e) => setLimitInput(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-2xl bg-[#f5f6f7] outline-none focus:ring-2 focus:ring-[#16a34a]"
          />
          <PrimaryButton onClick={handleLimitSave} disabled={saving} className="px-5">
            Kaydet
          </PrimaryButton>
        </div>
        <p className="text-xs text-[#9ca3af] mt-2">
          Değişiklik yarından itibaren geçerli olur, geçmiş günler etkilenmez.
        </p>
      </Card>

      <Card>
        <h2 className="font-semibold mb-1">Paket bilgisi</h2>
        <p className="text-sm text-[#6b7280] mb-3">
          {settings.packagePrice} TL / {settings.cigarettesPerPack} adet ·{" "}
          <span className="font-semibold text-[#1f2328]">
            {costPerCigarette.toFixed(2)} TL
          </span>{" "}
          / sigara
        </p>
        <div className="flex gap-2">
          <input
            type="number"
            min={0}
            placeholder={`Fiyat (${settings.packagePrice})`}
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-2xl bg-[#f5f6f7] outline-none focus:ring-2 focus:ring-[#16a34a]"
          />
          <input
            type="number"
            min={1}
            placeholder={`Adet (${settings.cigarettesPerPack})`}
            value={countInput}
            onChange={(e) => setCountInput(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-2xl bg-[#f5f6f7] outline-none focus:ring-2 focus:ring-[#16a34a]"
          />
        </div>
        <PrimaryButton onClick={handlePackageSave} disabled={saving} className="w-full py-2.5 mt-3">
          Kaydet
        </PrimaryButton>
      </Card>

      <Card>
        <h2 className="font-semibold mb-1">Hesap</h2>
        <p className="text-sm text-[#6b7280] mb-3">{user?.email}</p>
        <GhostButton onClick={() => logOut()} className="w-full py-2.5">
          Çıkış Yap
        </GhostButton>
      </Card>

      <Card>
        <h2 className="font-semibold mb-1 text-[#dc2626]">Tehlikeli Bölge</h2>
        <p className="text-sm text-[#6b7280] mb-3">
          Tüm sigara geçmişini, istatistikleri ve günlük hak devir kayıtlarını siler.
          Günlük limit, paket fiyatı ve hesabın korunur.
        </p>

        {!confirmingReset ? (
          <DangerButton onClick={() => setConfirmingReset(true)} className="w-full py-2.5">
            Tüm Verileri Sıfırla
          </DangerButton>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium text-[#dc2626]">
              Tüm sigara geçmişiniz, istatistikleriniz ve günlük hak geçmişiniz
              silinecek. Bu işlem geri alınamaz.
            </p>
            <div className="flex gap-2">
              <GhostButton
                onClick={() => setConfirmingReset(false)}
                className="flex-1 py-2.5"
                disabled={resetting}
              >
                Vazgeç
              </GhostButton>
              <DangerButton onClick={handleReset} className="flex-1 py-2.5" disabled={resetting}>
                {resetting ? "Siliniyor…" : "Evet, Sıfırla"}
              </DangerButton>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
