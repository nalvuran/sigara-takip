import { NavLink } from "react-router-dom";

const items = [
  { to: "/", label: "Ana Sayfa", icon: "🏠" },
  { to: "/istatistik", label: "İstatistik", icon: "📊" },
  { to: "/gecmis", label: "Geçmiş", icon: "🕒" },
  { to: "/ayarlar", label: "Ayarlar", icon: "⚙️" },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 sm:top-0 sm:bottom-auto bg-white/95 backdrop-blur border-t sm:border-t-0 sm:border-b border-black/5 z-20">
      <div className="max-w-xl sm:max-w-3xl mx-auto flex justify-around sm:justify-start sm:gap-2 px-2 sm:px-6 py-2 sm:py-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex flex-col sm:flex-row items-center gap-0.5 sm:gap-2 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                isActive
                  ? "text-[#16a34a] bg-[#16a34a]/10"
                  : "text-[#6b7280]"
              }`
            }
          >
            <span className="text-lg sm:text-base" aria-hidden>
              {item.icon}
            </span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
