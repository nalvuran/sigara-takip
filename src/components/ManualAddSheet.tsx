import { useEffect, useState } from "react";
import {
  toLocalDateTimeInputValue,
  parseLocalDateTimeInput,
  addDaysToDateString,
  todayLocalDateString,
} from "../logic/dateUtils";
import { PrimaryButton, GhostButton } from "./ui";

interface ManualAddSheetProps {
  open: boolean;
  busy: boolean;
  error: string | null;
  maxBackDays: number;
  onSubmit: (timestampMs: number) => void;
  onClose: () => void;
}

export function ManualAddSheet({
  open,
  busy,
  error,
  maxBackDays,
  onSubmit,
  onClose,
}: ManualAddSheetProps) {
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValue(toLocalDateTimeInputValue(Date.now()));
      setLocalError(null);
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
  }, [open]);

  if (!open) return null;

  const maxValue = toLocalDateTimeInputValue(Date.now());
  const minValue = `${addDaysToDateString(todayLocalDateString(), -maxBackDays)}T00:00`;

  function handleSubmit() {
    const ms = parseLocalDateTimeInput(value);
    if (ms === null) {
      setLocalError("Geçerli bir tarih ve saat seç.");
      return;
    }
    if (ms > Date.now()) {
      setLocalError("Gelecek bir zaman seçilemez.");
      return;
    }
    setLocalError(null);
    onSubmit(ms);
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center transition-colors duration-300 ${
        visible ? "bg-black/40" : "bg-black/0"
      }`}
      onClick={busy ? undefined : onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-xl bg-white rounded-t-3xl px-5 pt-4 transition-transform duration-300 ease-out ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 2rem)" }}
      >
        <div className="w-10 h-1.5 bg-[#e5e7eb] rounded-full mx-auto mb-4" />
        <h2 className="text-lg font-semibold mb-1">Geçmişe sigara ekle</h2>
        <p className="text-sm text-[#6b7280] mb-4">
          Kaydetmeyi unuttuysan, ne zaman içtiğini seç.
        </p>

        <input
          type="datetime-local"
          value={value}
          min={minValue}
          max={maxValue}
          onChange={(e) => setValue(e.target.value)}
          className="w-full px-4 py-3 rounded-2xl bg-[#f5f6f7] outline-none focus:ring-2 focus:ring-[#16a34a] text-[15px] mb-3"
        />

        {(localError || error) && (
          <p className="text-sm text-[#dc2626] mb-3">{localError ?? error}</p>
        )}

        <div className="flex gap-2">
          <GhostButton onClick={onClose} disabled={busy} className="flex-1 py-3">
            Vazgeç
          </GhostButton>
          <PrimaryButton onClick={handleSubmit} disabled={busy} className="flex-1 py-3">
            {busy ? "Ekleniyor…" : "Ekle"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
