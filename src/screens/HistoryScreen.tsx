import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useSmokesRange } from "../hooks/useSmokes";
import { ManualAddSheet } from "../components/ManualAddSheet";
import { ReasonSheet } from "../components/ReasonSheet";
import { DeleteConfirmSheet } from "../components/DeleteConfirmSheet";
import type { SmokeRecord } from "../types";
import {
  addManualSmoke,
  deleteSmokeRecord,
  setSmokeReason,
  MAX_BACKFILL_DAYS,
} from "../services/firestoreService";
import { addDaysToDateString, todayLocalDateString, toLocalDayHeading, toLocalTimeString } from "../logic/dateUtils";
import { getReasonDef } from "../logic/reasons";

const RANGE_DAYS = MAX_BACKFILL_DAYS;

export function HistoryScreen() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const fromDate = addDaysToDateString(todayLocalDateString(), -RANGE_DAYS);
  const toDate = todayLocalDateString();
  const smokes = useSmokesRange(uid, fromDate, toDate);

  const [manualOpen, setManualOpen] = useState(false);
  const [manualBusy, setManualBusy] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [reasonSmokeId, setReasonSmokeId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleManualSubmit(timestampMs: number) {
    if (!uid) return;
    setManualBusy(true);
    setManualError(null);
    try {
      const { id, localDate } = await addManualSmoke(uid, timestampMs);
      setManualOpen(false);
      setReasonSmokeId(id);
      const dayLabel = toLocalDayHeading(timestampMs);
      setNotice(
        localDate === todayLocalDateString()
          ? `Kayıt eklendi. Bugünün toplamı güncellendi.`
          : `Kayıt eklendi. ${dayLabel} gününün toplamı güncellendi, sonraki günlerin hakkı buna göre yeniden hesaplandı.`
      );
    } catch (err) {
      setManualError(
        err instanceof Error && err.message
          ? err.message
          : "Kayıt eklenemedi, lütfen tekrar dene."
      );
    } finally {
      setManualBusy(false);
    }
  }

  const [deleteTarget, setDeleteTarget] = useState<SmokeRecord | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDeleteConfirm() {
    if (!uid || !deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      const result = await deleteSmokeRecord(uid, deleteTarget.id);
      const ts = deleteTarget.timestamp;
      setDeleteTarget(null);
      if (result) {
        setNotice(
          result.localDate === todayLocalDateString()
            ? "Kayıt silindi. Bugünün toplamı güncellendi."
            : `Kayıt silindi. ${toLocalDayHeading(ts)} gününün toplamı güncellendi, sonraki günlerin hakkı buna göre yeniden hesaplandı.`
        );
      }
    } catch (err) {
      setDeleteError(
        err instanceof Error && err.message
          ? err.message
          : "Kayıt silinemedi, lütfen tekrar dene."
      );
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleReasonSelect(reasonId: string) {
    if (uid && reasonSmokeId) {
      await setSmokeReason(uid, reasonSmokeId, reasonId);
    }
    setReasonSmokeId(null);
  }

  const groups = useMemo(() => {
    const map = new Map<string, typeof smokes>();
    for (const s of smokes) {
      const list = map.get(s.localDate) ?? [];
      list.push(s);
      map.set(s.localDate, list);
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, list]) => {
        const ascending = [...list].sort((a, b) => a.timestamp - b.timestamp);
        const ordinal = new Map(ascending.map((s, i) => [s.id, i + 1]));
        return {
          date,
          ordinal,
          list: [...list].sort((a, b) => b.timestamp - a.timestamp),
        };
      });
  }, [smokes]);

  return (
    <div className="max-w-xl mx-auto px-6 pt-14 pb-32 sm:pt-32">
      <div className="flex items-baseline justify-between mb-10">
        <h1 className="font-serif-display text-[34px] text-[var(--ink)] leading-none">Geçmiş</h1>
        <button
          onClick={() => {
            setManualError(null);
            setManualOpen(true);
          }}
          className="text-[14px] text-[var(--ink-soft)]"
        >
          + Ekle
        </button>
      </div>

      {notice && (
        <p
          onClick={() => setNotice(null)}
          className="text-[13px] leading-relaxed text-[var(--ink-soft)] pb-4 mb-8 border-b border-[var(--border)]"
        >
          {notice}
        </p>
      )}

      {groups.length === 0 && (
        <p className="text-[var(--ink-soft)] text-[14px]">
          Henüz kayıt yok. Ana sayfadan sigara ekleyince burada görünecek.
        </p>
      )}

      <div>
        {groups.map((group) => (
          <div key={group.date} className="mb-9">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-[var(--ink-faint)] uppercase mb-3">
              {toLocalDayHeading(group.list[0].timestamp)}
              <span className="font-normal normal-case tracking-normal"> · {group.list.length} sigara</span>
            </p>

            <div>
              {group.list.map((s, i) => (
                <div
                  key={s.id}
                  className={`flex items-start gap-4 py-3 ${
                    i < group.list.length - 1 ? "border-b border-[var(--border)]" : ""
                  }`}
                >
                  <div className="w-[52px] shrink-0 pt-0.5 text-[15px] font-medium tabular-nums text-[var(--ink)]">
                    {toLocalTimeString(s.timestamp)}
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] text-[var(--ink)]">
                      {s.reason ? getReasonDef(s.reason).label : "—"}
                    </p>
                    <p className="text-[12px] text-[var(--ink-faint)] mt-0.5">
                      {group.ordinal.get(s.id)}. sigara
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setDeleteError(null);
                      setDeleteTarget(s);
                    }}
                    aria-label="Kaydı sil"
                    className="w-8 h-8 -mr-1 flex items-center justify-center text-[var(--ink-faint)]"
                  >
                    <Trash2 size={16} strokeWidth={1.6} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <ManualAddSheet
        open={manualOpen}
        busy={manualBusy}
        error={manualError}
        maxBackDays={MAX_BACKFILL_DAYS}
        onSubmit={handleManualSubmit}
        onClose={() => setManualOpen(false)}
      />

      <DeleteConfirmSheet
        open={deleteTarget !== null}
        busy={deleteBusy}
        error={deleteError}
        summary={
          deleteTarget
            ? `${toLocalDayHeading(deleteTarget.timestamp)} · ${toLocalTimeString(
                deleteTarget.timestamp
              )}${deleteTarget.reason ? " · " + getReasonDef(deleteTarget.reason).label : ""}`
            : ""
        }
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      <ReasonSheet
        open={reasonSmokeId !== null}
        onSelect={handleReasonSelect}
        onDismiss={() => setReasonSmokeId(null)}
      />
    </div>
  );
}
