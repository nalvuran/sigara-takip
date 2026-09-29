import { useEffect } from "react";
import type { UserSettings } from "../types";

/**
 * Kullanıcının Ayarlar'dan seçtiği temayı (settings.darkMode) <html>
 * elemanına "dark" class'ı olarak uygular. Firestore'un canlı dinleyicisi
 * sayesinde, Ayarlar'da değiştirilen tercih anında (sayfa yenilenmeden) tüm
 * ekranlara yayılır. Giriş yapılmamışken veya ayar henüz yüklenmemişken
 * her zaman açık mod kullanılır.
 */
export function useThemeSync(settings: UserSettings | null) {
  useEffect(() => {
    document.documentElement.classList.toggle("dark", !!settings?.darkMode);
  }, [settings?.darkMode]);
}
