import { NavLink } from "react-router-dom";
import { House, Clock, Settings } from "lucide-react";
import { Mirror } from "./icons/Mirror";

const items = [
  { to: "/", label: "Ana Sayfa", Icon: House },
  { to: "/istatistik", label: "Ayna", Icon: Mirror },
  { to: "/gecmis", label: "Geçmiş", Icon: Clock },
  { to: "/ayarlar", label: "Ayarlar", Icon: Settings },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 sm:top-0 sm:bottom-auto bg-[var(--surface-translucent)] backdrop-blur border-t sm:border-t-0 sm:border-b border-[var(--border)] z-20">
      <div className="max-w-xl sm:max-w-3xl mx-auto flex justify-around sm:justify-start sm:gap-8 px-2 sm:px-6 py-2.5 sm:py-4">
        {items.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-3 py-1 text-[11px] sm:text-sm transition-colors ${
                isActive ? "text-[var(--accent)]" : "text-[var(--ink-faint)]"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={21} strokeWidth={isActive ? 2 : 1.6} />
                <span className={isActive ? "font-medium" : "font-normal"}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
