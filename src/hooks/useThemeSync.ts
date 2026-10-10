import { useEffect } from "react";
import type { UserSettings } from "../types";

/**
 * Karanlık mod seçeneği kaldırıldı; uygulama her zaman açık temada çalışır.
 * Eskiden kaydedilmiş darkMode değeri olsa bile "dark" sınıfı kaldırılır.
 */
export function useThemeSync(_settings: UserSettings | null) {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);
}
