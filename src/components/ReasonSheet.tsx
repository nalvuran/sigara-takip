import { useEffect, useState } from "react";
import { SMOKE_REASONS } from "../logic/reasons";

interface ReasonSheetProps {
  open: boolean;
  onSelect: (reasonId: string) => void;
  onDismiss: () => void;
}

export function ReasonSheet({ open, onSelect, onDismiss }: ReasonSheetProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      // Bir sonraki frame'de görünür yap ki transition tetiklensin.
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
      onClick={onDismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-xl bg-white rounded-t-3xl px-5 pt-4 pb-8 transition-transform duration-300 ease-out ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 2rem)" }}
      >
        <div className="w-10 h-1.5 bg-[#e5e7eb] rounded-full mx-auto mb-4" />

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Neden içtin?</h2>
          <button
            onClick={onDismiss}
            aria-label="Kapat"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f1f2f4] text-[#6b7280] text-sm"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {SMOKE_REASONS.map((r) => (
            <button
              key={r.id}
              onClick={() => onSelect(r.id)}
              className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl bg-[#f5f6f7] active:bg-[#e5e7eb] transition-colors"
            >
              <span className="text-3xl">{r.emoji}</span>
              <span className="text-xs font-medium text-[#1f2328] text-center leading-tight">
                {r.label}
              </span>
            </button>
          ))}
        </div>

        <p className="text-xs text-[#9ca3af] text-center mt-4">
          İstersen boş geç, dilediğin zaman değiştirebilirsin.
        </p>
      </div>
    </div>
  );
}
