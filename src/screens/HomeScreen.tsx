import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useUserSettings } from "../hooks/useUserSettings";
import { useTodayLedger } from "../hooks/useTodayLedger";
import { useSmokesForDate } from "../hooks/useSmokes";
import { Card, GhostButton } from "../components/ui";
import { ReasonSheet } from "../components/ReasonSheet";
import { StatsGrid } from "../components/StatsGrid";
import { ConsumptionChart } from "../components/ConsumptionChart";
import { useStatsData } from "../hooks/useStatsData";
import { setSmokeReason } from "../services/firestoreService";
import { calculateCostPerCigarette, calculateDailyCost } from "../logic/allowance";
import { formatElapsedSince, toLocalTimeString } from "../logic/dateUtils";

export function HomeScreen() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const settings = useUserSettings(uid);
  const { today, entry, baseLimit, smoke, undo } = useTodayLedger(uid, settings);
  const smokes = useSmokesForDate(uid, today);

  const stats = useStatsData(uid, "all");

  const [busy, setBusy] = useState(false);
  const [showUndo, setShowUndo] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [reasonSheetOpen, setReasonSheetOpen] = useState(false);
  const [pendingSmokeId, setPendingSmokeId] = useState<string | null>(null);

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
      const newId = await smoke();
      setShowUndo(true);
      if (newId) {
        setPendingSmokeId(newId);
        setReasonSheetOpen(true);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleReasonSelect(reasonId: string) {
    if (uid && pendingSmokeId) {
      await setSmokeReason(uid, pendingSmokeId, reasonId);
    }
    setReasonSheetOpen(false);
    setPendingSmokeId(null);
  }

  function handleReasonDismiss() {
    setReasonSheetOpen(false);
    setPendingSmokeId(null);
  }

  async function handleUndo() {
    if (!lastSmoke) return;
    await undo(lastSmoke.id);
    setShowUndo(false);
  }

  const remainingIsNegative = remaining < 0;

  return (
    <div className="max-w-xl mx-auto px-5 pt-8 pb-28 sm:pt-28">
      <p className="text-[var(--ink-soft)] text-sm font-medium mb-1">BUGÜN</p>

      <div className="mb-1">
        <span
          className={`text-7xl font-bold tracking-tight ${
            remainingIsNegative ? "text-[var(--danger)]" : "text-[var(--ink)]"
          }`}
        >
          {remaining}
        </span>
      </div>
      <p className="text-[var(--ink-soft)] mb-6">
        {remainingIsNegative ? "hak açığın var" : "sigara hakkın kaldı"}
      </p>

      <div className="flex justify-center mb-3">
        <button
          onClick={handleSmoke}
          disabled={busy}
          aria-label="İçtim"
          className="w-40 h-40 flex items-center justify-center text-8xl active:scale-90 disabled:opacity-40 transition-transform"
          style={{ filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.15))" }}
        >
          🚭
        </button>
      </div>

      {lastSmoke && showUndo && (
        <GhostButton onClick={handleUndo} className="w-full py-2.5 text-sm mb-2">
          ↩ Geri Al
        </GhostButton>
      )}

      <p className="text-center text-sm text-[var(--ink-soft)] mb-6">
        {consumption} / {allowance} içildi
      </p>

      {rolloverMessage && (
        <Card className="mb-4 !py-4">
          <p className="text-sm text-[var(--ink-soft)] leading-relaxed">{rolloverMessage}</p>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card className="!p-4">
          <p className="text-xs text-[var(--ink-soft)] mb-1">⏱ Son sigara</p>
          <p className="text-sm font-semibold">
            {lastSmoke ? formatElapsedSince(lastSmoke.timestamp, now) : "—"}
          </p>
          {lastSmoke && (
            <p className="text-xs text-[var(--ink-soft)] mt-0.5">
              {toLocalTimeString(lastSmoke.timestamp)}
            </p>
          )}
        </Card>
        <Card className="!p-4">
          <p className="text-xs text-[var(--ink-soft)] mb-1">💰 Bugünkü harcama</p>
          <p className="text-sm font-semibold">{todayCost.toFixed(2)} TL</p>
        </Card>
      </div>

      <div className="mt-8">
        <p className="text-xs text-[var(--ink-soft)] mb-3">Tüm zamanlar</p>
        <StatsGrid stats={stats} />
        <div className="mt-5">
          <ConsumptionChart data={stats.chartData} />
        </div>
      </div>

      <ReasonSheet
        open={reasonSheetOpen}
        onSelect={handleReasonSelect}
        onDismiss={handleReasonDismiss}
      />
    </div>
  );
}
