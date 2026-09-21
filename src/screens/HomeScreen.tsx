import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useUserSettings } from "../hooks/useUserSettings";
import { useTodayLedger } from "../hooks/useTodayLedger";
import { useSmokesForDate } from "../hooks/useSmokes";
import { useGoal } from "../hooks/useGoal";
import { useLedgerRange } from "../hooks/useLedgerRange";
import { Card, GhostButton } from "../components/ui";
import {
  calculateCostPerCigarette,
  calculateDailyCost,
  calculateSavings,
} from "../logic/allowance";
import { calculateGoalProgress, calculateCurrentStreak } from "../logic/goals";
import {
  formatElapsedSince,
  toLocalTimeString,
  addDaysToDateString,
} from "../logic/dateUtils";

export function HomeScreen() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const settings = useUserSettings(uid);
  const { today, entry, baseLimit, smoke, undo } = useTodayLedger(uid, settings);
  const smokes = useSmokesForDate(uid, today);
  const { goal } = useGoal(uid);
  const ledgerHistory = useLedgerRange(uid, addDaysToDateString(today, -90), today);

  const [busy, setBusy] = useState(false);
  const [showUndo, setShowUndo] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!showUndo) return;
    const t = setTimeout(() => setShowUndo(false), 6000);
    return () => clearTimeout(t);
  }, [showUndo]);

  const lastSmoke = smokes[smokes.length - 1];
  const costPerCigarette = settings
    ? calculateCostPerCigarette(settings.packagePrice, settings.cigarettesPerPack)
    : 0;

  const consumption = entry?.consumption ?? 0;
  const allowance = entry?.allowance ?? baseLimit;
  const remaining = entry?.remaining ?? baseLimit;

  const todayCost = calculateDailyCost(consumption, costPerCigarette);
  const savings = calculateSavings(baseLimit, consumption, costPerCigarette);

  const rolloverMessage = useMemo(() => {
    if (!entry) return null;
    if (remaining >= 0) {
      return `${allowance} hakkın vardı, ${consumption} içtin, ${remaining} hakkın yarına devredecek.`;
    }
    return `${allowance} hakkın vardı, ${consumption} içtin, ${Math.abs(
      remaining
    )} hak sonraki günden düşülecek.`;
  }, [entry, allowance, consumption, remaining]);

  async function handleSmoke() {
    if (busy) return;
    setBusy(true);
    try {
      await smoke();
      setShowUndo(true);
    } finally {
      setBusy(false);
    }
  }

  async function handleUndo() {
    if (!lastSmoke) return;
    await undo(lastSmoke.id);
    setShowUndo(false);
  }

  const currentStreak = useMemo(
    () => calculateCurrentStreak(ledgerHistory),
    [ledgerHistory]
  );

  const goalProgress = useMemo(() => {
    if (!goal) return null;
    return calculateGoalProgress(goal, settings?.dailyLimit ?? baseLimit, today);
  }, [goal, settings, baseLimit, today]);

  const remainingIsNegative = remaining < 0;

  return (
    <div className="max-w-xl mx-auto px-5 pt-8 pb-28 sm:pt-28">
      <p className="text-[#6b7280] text-sm font-medium mb-1">BUGÜN</p>

      <div className="mb-1">
        <span
          className={`text-7xl font-bold tracking-tight ${
            remainingIsNegative ? "text-[#dc2626]" : "text-[#1f2328]"
          }`}
        >
          {remaining}
        </span>
      </div>
      <p className="text-[#6b7280] mb-6">
        {remainingIsNegative ? "hak açığın var" : "sigara hakkın kaldı"}
      </p>

      <div className="flex justify-center mb-3">
        <button
          onClick={handleSmoke}
          disabled={busy}
          aria-label="İçtim"
          className="w-32 h-32 rounded-full bg-[#dc2626] active:bg-[#b91c1c] disabled:opacity-40 disabled:active:bg-[#dc2626] shadow-lg flex items-center justify-center text-6xl transition-colors"
        >
          🚭
        </button>
      </div>

      {lastSmoke && showUndo && (
        <GhostButton onClick={handleUndo} className="w-full py-2.5 text-sm mb-2">
          ↩ Geri Al
        </GhostButton>
      )}

      <p className="text-center text-sm text-[#6b7280] mb-6">
        {consumption} / {allowance} içildi
      </p>

      {rolloverMessage && (
        <Card className="mb-4 !py-4">
          <p className="text-sm text-[#6b7280] leading-relaxed">{rolloverMessage}</p>
        </Card>
      )}

      {currentStreak > 0 && (
        <Card className="mb-4 !py-4 flex items-center gap-3">
          <span className="text-2xl">🔥</span>
          <p className="text-sm">
            <span className="font-semibold">{currentStreak} gün</span> üst üste
            limitin altında kaldın!
          </p>
        </Card>
      )}

      {goal && goalProgress ? (
        <Card className="mb-4 !py-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">🎯 Hedef: {goal.targetLimit}</p>
            {goalProgress.percentComplete !== null && (
              <p className="text-xs text-[#6b7280]">%{goalProgress.percentComplete}</p>
            )}
          </div>
          {goalProgress.percentComplete !== null && (
            <div className="h-2 bg-[#f1f2f4] rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-[#16a34a] rounded-full transition-all"
                style={{ width: `${goalProgress.percentComplete}%` }}
              />
            </div>
          )}
          <p className="text-xs text-[#6b7280]">
            {goalProgress.isAheadOrOnTrack
              ? "Hedefinle uyumlu gidiyorsun 👍"
              : "Şu an hedefin biraz gerisindesin, sorun değil, devam et"}
          </p>
        </Card>
      ) : (
        !goal && (
          <Link to="/ayarlar">
            <Card className="mb-4 !py-4">
              <p className="text-sm text-[#6b7280]">
                🎯 Henüz bir hedefin yok. Azaltma hedefi belirlemek için Ayarlar'a git.
              </p>
            </Card>
          </Link>
        )
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card className="!p-4">
          <p className="text-xs text-[#6b7280] mb-1">⏱ Son sigara</p>
          <p className="text-sm font-semibold">
            {lastSmoke ? formatElapsedSince(lastSmoke.timestamp, now) : "—"}
          </p>
          {lastSmoke && (
            <p className="text-xs text-[#6b7280] mt-0.5">
              {toLocalTimeString(lastSmoke.timestamp)}
            </p>
          )}
        </Card>
        <Card className="!p-4">
          <p className="text-xs text-[#6b7280] mb-1">💰 Bugünkü harcama</p>
          <p className="text-sm font-semibold">{todayCost.toFixed(2)} TL</p>
        </Card>
        <Card className="!p-4 col-span-2">
          <p className="text-xs text-[#6b7280] mb-1">💚 İçilmeyen sigaraların değeri</p>
          <p className="text-sm font-semibold">{savings.toFixed(2)} TL</p>
        </Card>
      </div>
    </div>
  );
}
