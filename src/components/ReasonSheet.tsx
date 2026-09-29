import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { SMOKE_REASONS } from "../logic/reasons";

interface ReasonSheetProps {
  open: boolean;
  onSelect: (reasonId: string) => void;
  onDismiss: () => void;
}

export function ReasonSheet({ open, onSelect, onDismiss }: ReasonSheetProps) {
  const [visible, setVisible] = useState(false);
  const [rowsIn, setRowsIn] = useState(false);

  useEffect(() => {
    if (open) {
      const raf = requestAnimationFrame(() => setVisible(true));
      const t = setTimeout(() => setRowsIn(true), 180);
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(t);
      };
    }
    setVisible(false);
    setRowsIn(false);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center transition-colors duration-200 ${
        visible ? "bg-black/35" : "bg-black/0"
      }`}
      onClick={onDismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-xl bg-[var(--surface)] rounded-t-[28px] px-6 pt-4 transition-transform duration-[250ms] ease-out ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 1.5rem)" }}
      >
        <div className="w-9 h-1 bg-[var(--border-soft)] rounded-full mx-auto mb-5" />

        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[17px] font-semibold">Neden içtin?</h2>
          <button
            onClick={onDismiss}
            aria-label="Kapat"
            className="w-8 h-8 -mr-1 flex items-center justify-center text-[var(--ink-faint)]"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div>
          {SMOKE_REASONS.map((r, i) => {
            const Icon = r.icon;
            return (
              <button
                key={r.id}
                onClick={() => onSelect(r.id)}
                style={{ transitionDelay: rowsIn ? `${i * 30}ms` : "0ms" }}
                className={`w-full flex items-center gap-3.5 py-3.5 text-left active:bg-[var(--surface-2)] rounded-xl transition-all duration-200 ease-out ${
                  rowsIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1.5"
                } ${i < SMOKE_REASONS.length - 1 ? "border-b border-[var(--border)]" : ""}`}
              >
                <Icon size={19} strokeWidth={1.6} color="var(--ink-soft)" />
                <span className="text-[15px] text-[var(--ink)]">{r.label}</span>
              </button>
            );
          })}
        </div>

        <p className="text-[12px] text-[var(--ink-faint)] text-center mt-4">
          İstersen boş geç, dilediğin zaman değiştirebilirsin.
        </p>
      </div>
    </div>
  );
}
