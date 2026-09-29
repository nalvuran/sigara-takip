import { useEffect, useState } from "react";
import { SMOKE_REASONS } from "../logic/reasons";

interface ReasonSheetProps {
  open: boolean;
  onSelect: (reasonId: string) => void;
  onDismiss: () => void;
}

export function ReasonSheet({ open, onSelect, onDismiss }: ReasonSheetProps) {
  const [visible, setVisible] = useState(false);
  const [bubblesIn, setBubblesIn] = useState(false);

  useEffect(() => {
    if (open) {
      const raf = requestAnimationFrame(() => setVisible(true));
      // Baloncuklar, sheet tamamen yukarı kaydıktan hemen sonra sırayla belirir.
      const t = setTimeout(() => setBubblesIn(true), 200);
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(t);
      };
    }
    setVisible(false);
    setBubblesIn(false);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center transition-colors duration-300 ${
        visible ? "bg-black/40" : "bg-black/0"
      }`}
      onClick={onDismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-xl bg-[var(--surface)] rounded-t-3xl px-5 pt-4 pb-8 transition-transform duration-300 ease-out ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 2rem)" }}
      >
        <div className="w-10 h-1.5 bg-[var(--border-soft)] rounded-full mx-auto mb-4" />

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Neden içtin?</h2>
          <button
            onClick={onDismiss}
            aria-label="Kapat"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--ink-soft)] text-sm"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-wrap justify-center gap-x-6 gap-y-5 px-2">
          {SMOKE_REASONS.map((r, i) => (
            <button
              key={r.id}
              onClick={() => onSelect(r.id)}
              style={{ transitionDelay: bubblesIn ? `${i * 45}ms` : "0ms" }}
              className={`flex flex-col items-center gap-1.5 w-24 active:scale-90 transition-all duration-300 ease-out ${
                bubblesIn ? "opacity-100 scale-100" : "opacity-0 scale-50"
              }`}
            >
              <span className="text-6xl leading-none">{r.emoji}</span>
              <span className="text-xs font-medium text-[var(--ink)] text-center leading-tight">
                {r.label}
              </span>
            </button>
          ))}
        </div>

        <p className="text-xs text-[var(--ink-faint)] text-center mt-5">
          İstersen boş geç, dilediğin zaman değiştirebilirsin.
        </p>
      </div>
    </div>
  );
}
