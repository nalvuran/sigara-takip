import { useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useSmokesRange } from "../hooks/useSmokes";
import { Card, PrimaryButton } from "../components/ui";
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
      .map(([date, list]) => ({
        date,
        list: [...list].sort((a, b) => b.timestamp - a.timestamp),
      }));
  }, [smokes]);

  return (
    <div className="max-w-xl mx-auto px-5 pt-8 pb-28 sm:pt-28">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold">Geçmiş</h1>
        <PrimaryButton
          onClick={() => {
            setManualError(null);
            setManualOpen(true);
          }}
          className="px-4 py-2 text-sm"
        >
          + Ekle
        </PrimaryButton>
      </div>

      {notice && (
        <div
          onClick={() => setNotice(null)}
          className="text-sm text-[#1f2328] bg-[#f1f2f4] rounded-2xl px-4 py-3 mb-4"
        >
          {notice}
        </div>
      )}

      {groups.length === 0 && (
        <Card>
          <p className="text-[#6b7280] text-sm">
            Henüz kayıt yok. Ana sayfadan sigara ekleyince burada görünecek.
          </p>
        </Card>
      )}

      <div className="space-y-5">
        {groups.map((group) => (
          <div key={group.date}>
            <p className="text-sm font-semibold text-[#6b7280] mb-2 px-1">
              {toLocalDayHeading(group.list[0].timestamp)}
              <span className="text-[#9ca3af] font-normal"> · {group.list.length} sigara</span>
            </p>
            <Card className="!p-2">
              {group.list.map((s, i) => (
                <div
                  key={s.id}
                  className={`flex items-center gap-3 px-3 py-2.5 ${
                    i !== group.list.length - 1 ? "border-b border-black/5" : ""
                  }`}
                >
                  <span className="text-lg">{s.reason ? getReasonDef(s.reason).emoji : "🚬"}</span>
                  <span className="text-[15px]">{toLocalTimeString(s.timestamp)}</span>
                  {s.reason && (
                    <span className="text-xs text-[#9ca3af] ml-auto">
                      {getReasonDef(s.reason).label}
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setDeleteError(null);
                      setDeleteTarget(s);
                    }}
                    aria-label="Kaydı sil"
                    className={`w-9 h-9 flex items-center justify-center rounded-full text-[#6b7280] active:bg-[#f1f2f4] ${
                      s.reason ? "" : "ml-auto"
                    }`}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M6 6l1 14h10l1-14" />
                      <path d="M10 10v6M14 10v6" />
                    </svg>
                  </button>
                </div>
              ))}
            </Card>
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
