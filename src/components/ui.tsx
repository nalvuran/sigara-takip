import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

export function Card({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={`bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionLabel({ children }: PropsWithChildren) {
  return (
    <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--ink-faint)] uppercase mb-2">
      {children}
    </p>
  );
}

export function Divider() {
  return <div className="h-px bg-[var(--divider)]" />;
}

export function PrimaryButton({
  children,
  className = "",
  ...rest
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  return (
    <button
      className={`bg-[var(--accent)] active:bg-[var(--accent-dark)] disabled:opacity-40 disabled:active:bg-[var(--accent)] text-white font-semibold rounded-full transition-colors ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  className = "",
  ...rest
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  return (
    <button
      className={`text-[var(--ink)] bg-[var(--surface-2)] active:bg-[var(--border-soft)] font-medium rounded-full transition-colors ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function DangerButton({
  children,
  className = "",
  ...rest
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  return (
    <button
      className={`text-white bg-[var(--danger)] active:bg-[var(--danger-dark)] disabled:opacity-40 font-semibold rounded-full transition-colors ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-7 rounded-full shrink-0 transition-colors ${
        checked ? "bg-[var(--accent)]" : "bg-[var(--surface-2)]"
      }`}
    >
      <span
        className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}
