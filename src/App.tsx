import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { useUserSettings } from "./hooks/useUserSettings";
import { useThemeSync } from "./hooks/useThemeSync";
import { BottomNav } from "./components/BottomNav";
import { LoginScreen } from "./screens/LoginScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { StatsScreen } from "./screens/StatsScreen";
import { HistoryScreen } from "./screens/HistoryScreen";
import { SettingsScreen } from "./screens/SettingsScreen";

function App() {
  const { user, loading } = useAuth();
  const settings = useUserSettings(user?.uid ?? null);
  useThemeSync(settings);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--bg)]">
        <div className="w-2 h-2 rounded-full bg-[var(--ink-faint)] animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <BrowserRouter>
      <BottomNav />
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/istatistik" element={<StatsScreen />} />
        <Route path="/gecmis" element={<HistoryScreen />} />
        <Route path="/ayarlar" element={<SettingsScreen />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
