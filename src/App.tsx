import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { BottomNav } from "./components/BottomNav";
import { LoginScreen } from "./screens/LoginScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { StatsScreen } from "./screens/StatsScreen";
import { HistoryScreen } from "./screens/HistoryScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { AchievementsScreen } from "./screens/AchievementsScreen";

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#fafafa]">
        <div className="text-4xl animate-pulse">🚬</div>
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
        <Route path="/basarilar" element={<AchievementsScreen />} />
        <Route path="/ayarlar" element={<SettingsScreen />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
