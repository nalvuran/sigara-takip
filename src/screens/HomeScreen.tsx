import { useEffect, useMemo, useState } from "react";
import { Plus, Clock, Banknote } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useUserSettings } from "../hooks/useUserSettings";
import { useTodayLedger } from "../hooks/useTodayLedger";
import { useSmokesForDate } from "../hooks/useSmokes";
import { SectionLabel, Divider } from "../components/ui";
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
      return `${allowance} hakkın vardı · ${consumption} içtin · ${remaining} hakkın yarına devredecek`;
    }
    return `${allowance} hakkın vardı · ${consumption} içtin · ${Math.abs(
      remaining
    )} hak sonraki günden düşülecek`;
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
    <div className="max-w-xl mx-auto px-6 pt-14 pb-32 sm:pt-32">
      {/* Bugünkü durum */}
      <div className="text-center mb-10">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--ink-faint)] uppercase mb-3">
          Bugün
        </p>
        <div
          key={remaining}
          className={`font-bold tracking-tight tabular-nums leading-none animate-number ${
            remainingIsNegative ? "text-[var(--danger)]" : "text-[var(--ink)]"
          }`}
          style={{ fontSize: "104px" }}
        >
          {remaining}
        </div>
        <p className="text-[15px] text-[var(--ink-soft)] mt-3">
          {remainingIsNegative ? "hak açığın var" : "sigara hakkın kaldı"}
        </p>
      </div>

      {/* Aksiyon */}
      <div className="flex flex-col items-center gap-2.5 mb-8">
        <button
          onClick={handleSmoke}
          disabled={busy}
          aria-label="Sigara ekle"
          className="w-[76px] h-[76px] rounded-[26px] bg-[var(--accent-soft)] flex items-center justify-center active:scale-95 disabled:opacity-40 transition-transform"
        >
          <Plus size={30} strokeWidth={1.75} color="var(--accent)" />
        </button>
        <span className="text-[12px] text-[var(--ink-faint)]">Sigara ekle</span>

        {lastSmoke && showUndo && (
          <button
            onClick={handleUndo}
            className="text-[13px] text-[var(--ink-soft)] underline decoration-[var(--border-soft)] underline-offset-4 mt-1"
          >
            Geri al
          </button>
        )}
      </div>

      <p className="text-center text-[13px] text-[var(--ink-faint)] mb-7 tabular-nums">
        {consumption} / {allowance} içildi
      </p>

      {rolloverMessage && (
        <>
          <Divider />
          <p className="text-center text-[13px] leading-relaxed text-[var(--ink-soft)] py-4">
            {rolloverMessage}
          </p>
          <Divider />
        </>
      )}

      {/* Son sigara / Bugünkü harcama */}
      <div className="grid grid-cols-2 py-5">
        <div className="flex flex-col gap-1.5 pr-4">
          <div className="flex items-center gap-1.5 text-[var(--ink-faint)]">
            <Clock size={14} strokeWidth={1.75} />
            <span className="text-[11px] tracking-wide uppercase">Son sigara</span>
          </div>
          <p className="text-[16px] font-medium tabular-nums">
            {lastSmoke ? formatElapsedSince(lastSmoke.timestamp, now) : "—"}
          </p>
          {lastSmoke && (
            <p className="text-[12px] text-[var(--ink-faint)] tabular-nums">
              {toLocalTimeString(lastSmoke.timestamp)}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5 pl-4 border-l border-[var(--border)]">
          <div className="flex items-center gap-1.5 text-[var(--ink-faint)]">
            <Banknote size={14} strokeWidth={1.75} />
            <span className="text-[11px] tracking-wide uppercase">Bugünkü harcama</span>
          </div>
          <p className="text-[16px] font-medium tabular-nums">{todayCost.toFixed(2)} TL</p>
        </div>
      </div>
      <Divider />

      {/* Tüm zamanlar */}
      <div className="mt-9">
        <SectionLabel>Tüm zamanlar</SectionLabel>
        <StatsGrid stats={stats} />
        <div className="mt-8">
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
