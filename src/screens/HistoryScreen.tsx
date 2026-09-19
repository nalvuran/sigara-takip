import { useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import { useSmokesRange } from "../hooks/useSmokes";
import { Card } from "../components/ui";
import { addDaysToDateString, todayLocalDateString, toLocalDayHeading, toLocalTimeString } from "../logic/dateUtils";

const RANGE_DAYS = 60;

export function HistoryScreen() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const fromDate = addDaysToDateString(todayLocalDateString(), -RANGE_DAYS);
  const toDate = todayLocalDateString();
  const smokes = useSmokesRange(uid, fromDate, toDate);

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
      <h1 className="text-2xl font-bold mb-5">Geçmiş</h1>

      {groups.length === 0 && (
        <Card>
          <p className="text-[#6b7280] text-sm">
            Henüz kayıt yok. Ana sayfadan 🚬 İçtim'e bastığında burada görünecek.
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
                  <span className="text-lg">🚬</span>
                  <span className="text-[15px]">{toLocalTimeString(s.timestamp)}</span>
                </div>
              ))}
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
