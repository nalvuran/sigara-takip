import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

export function Card({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={`bg-white rounded-3xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.04)] p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function PrimaryButton({
  children,
  className = "",
  ...rest
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  return (
    <button
      className={`bg-[#16a34a] active:bg-[#15803d] disabled:opacity-40 disabled:active:bg-[#16a34a] text-white font-semibold rounded-full transition-colors ${className}`}
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
      className={`text-[#1f2328] bg-[#f1f2f4] active:bg-[#e5e7eb] font-medium rounded-full transition-colors ${className}`}
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
      className={`text-white bg-[#dc2626] active:bg-[#b91c1c] disabled:opacity-40 font-semibold rounded-full transition-colors ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
