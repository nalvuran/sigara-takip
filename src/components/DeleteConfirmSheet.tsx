import { useEffect, useState } from "react";
import { GhostButton, DangerButton } from "./ui";

interface DeleteConfirmSheetProps {
  open: boolean;
  busy: boolean;
  error: string | null;
  summary: string; // örn. "14:30 · Stres"
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmSheet({
  open,
  busy,
  error,
  summary,
  onConfirm,
  onCancel,
}: DeleteConfirmSheetProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center transition-colors duration-300 ${
        visible ? "bg-black/40" : "bg-black/0"
      }`}
      onClick={busy ? undefined : onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-xl bg-[var(--surface)] rounded-t-[28px] px-5 pt-4 transition-transform duration-300 ease-out ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 2rem)" }}
      >
        <div className="w-9 h-1 bg-[var(--border-soft)] rounded-full mx-auto mb-4" />
        <h2 className="text-lg font-semibold mb-1">Bu kaydı silelim mi?</h2>
        <p className="text-sm text-[var(--ink-soft)] mb-1">{summary}</p>
        <p className="text-xs text-[var(--ink-faint)] mb-4">
          O günün toplamı ve sonraki günlerin hakkı buna göre yeniden hesaplanır.
        </p>

        {error && <p className="text-sm text-[var(--danger)] mb-3">{error}</p>}

        <div className="flex gap-2">
          <GhostButton onClick={onCancel} disabled={busy} className="flex-1 py-3">
            Vazgeç
          </GhostButton>
          <DangerButton onClick={onConfirm} disabled={busy} className="flex-1 py-3">
            {busy ? "Siliniyor…" : "Sil"}
          </DangerButton>
        </div>
      </div>
    </div>
  );
}
