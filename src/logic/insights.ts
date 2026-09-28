import { SMOKE_REASONS, getReasonDef } from "./reasons";
import {
  getLocalHour,
  isLocalWeekend,
  toLocalWeekdayName,
} from "./dateUtils";
import {
  calculateSmokingIntervals,
  calculateAverageInterval,
  calculateLongestSmokeFreeInterval,
  formatMinutesAsDuration,
} from "./allowance";

/**
 * YORUMLAR — TASARIM İLKESİ
 * --------------------------
 * Bu motor, kullanıcının kendi verisinde bir örüntü bulup bunu ona
 * *yansıtıcı bir soru* olarak sunar. Asla:
 *   - "azaltmalısın", "iyi gidiyorsun" gibi bir yön/değer yargısı içermez
 *   - bir tavsiye/öğüt vermez
 * Her zaman:
 *   - gözlemi nötr bir dille anlatır ("X, Y saatlerinde yoğunlaşıyor")
 *   - "bu sana tanıdık geliyor mu?" gibi kullanıcıyı kendi yorumuna davet
 *     eden bir soruyla biter
 * Anlamlı olması için her örüntünün belirli bir minimum veri eşiği vardır;
 * eşik geçilmeden o örüntü hiç önerilmez (yanıltıcı erken çıkarım riski).
 */

export interface InsightSmoke {
  timestamp: number;
  localDate: string;
  reason?: string | null;
}

export interface Insight {
  id: string;
  text: string;
}

type Daypart = "gece" | "sabah" | "öğleden sonra" | "akşam";

function daypartOf(hour: number): Daypart {
  if (hour >= 0 && hour < 6) return "gece";
  if (hour >= 6 && hour < 12) return "sabah";
  if (hour >= 12 && hour < 18) return "öğleden sonra";
  return "akşam";
}

const MIN_FOR_REASON_PATTERN = 5;
const MIN_FOR_DOMINANT_REASON = 10;
const MIN_FOR_WEEKDAY_CLUSTER = 14;
const MIN_DAYS_FOR_FIRST_SMOKE = 7;
const MIN_FOR_LONGEST_GAP = 10;

/** Kullanıcının verisinde tespit edilebilecek tüm uygun (eşiği geçmiş) yorumları toplar. */
export function collectInsights(smokes: InsightSmoke[]): Insight[] {
  const insights: Insight[] = [];
  const total = smokes.length;

  // 1) Sebep × gün içi zaman dilimi
  for (const reason of SMOKE_REASONS) {
    const list = smokes.filter((s) => s.reason === reason.id);
    if (list.length < MIN_FOR_REASON_PATTERN) continue;

    const buckets: Record<Daypart, number> = {
      gece: 0,
      sabah: 0,
      "öğleden sonra": 0,
      akşam: 0,
    };
    for (const s of list) buckets[daypartOf(getLocalHour(s.timestamp))]++;

    const [topBucket, topCount] = (
      Object.entries(buckets) as [Daypart, number][]
    ).sort((a, b) => b[1] - a[1])[0];

    if (topCount / list.length >= 0.6) {
      insights.push({
        id: `reason-daypart-${reason.id}`,
        text: `${reason.label} kaynaklı sigaraların çoğu ${topBucket} saatlerinde — bu sana tanıdık geliyor mu?`,
      });
    }
  }

  // 2) Sebep × hafta sonu yoğunluğu
  for (const reason of SMOKE_REASONS) {
    const list = smokes.filter((s) => s.reason === reason.id);
    if (list.length < MIN_FOR_REASON_PATTERN) continue;

    const weekendCount = list.filter((s) => isLocalWeekend(s.timestamp)).length;
    if (weekendCount / list.length >= 0.5) {
      insights.push({
        id: `reason-weekend-${reason.id}`,
        text: `${reason.label} kaynaklı sigaraların büyük kısmı hafta sonlarına denk geliyor — bu sana tanıdık geliyor mu?`,
      });
    }
  }

  // 3) En baskın sebep
  if (total >= MIN_FOR_DOMINANT_REASON) {
    const counts = new Map<string, number>();
    for (const s of smokes) {
      if (s.reason) counts.set(s.reason, (counts.get(s.reason) ?? 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      const [topId, topCount] = sorted[0];
      if (topCount / total >= 0.4) {
        const def = getReasonDef(topId);
        insights.push({
          id: "dominant-reason",
          text: `En sık işaretlediğin neden "${def.label}" — bu senin için ne ifade ediyor?`,
        });
      }
    }
  }

  // 4) Haftanın belirli bir gününde kümelenme
  if (total >= MIN_FOR_WEEKDAY_CLUSTER) {
    const dayCounts = new Map<string, number>();
    for (const s of smokes) {
      const day = toLocalWeekdayName(s.timestamp);
      dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
    }
    const avg = total / dayCounts.size;
    const sorted = [...dayCounts.entries()].sort((a, b) => b[1] - a[1]);
    const [topDay, topCount] = sorted[0];
    if (topCount >= avg * 1.5 && topCount >= 5) {
      insights.push({
        id: "weekday-cluster",
        text: `Sigaraların ${topDay} günlerinde daha sık kümelenmiş görünüyor — bu sana tanıdık geliyor mu?`,
      });
    }
  }

  // 5) Günün ilk sigarasının zamanlaması
  {
    const earliestByDate = new Map<string, number>();
    for (const s of smokes) {
      const cur = earliestByDate.get(s.localDate);
      if (cur === undefined || s.timestamp < cur) {
        earliestByDate.set(s.localDate, s.timestamp);
      }
    }
    if (earliestByDate.size >= MIN_DAYS_FOR_FIRST_SMOKE) {
      const hours = [...earliestByDate.values()].map((ts) => getLocalHour(ts));
      const avgHour = Math.round(
        hours.reduce((a, b) => a + b, 0) / hours.length
      );
      if (avgHour <= 9) {
        insights.push({
          id: "first-smoke-early",
          text: `Günün ilk sigarası genelde saat ${avgHour}:00 civarında oluyor — bu sana tanıdık geliyor mu?`,
        });
      }
    }
  }

  // 6) Sebebe göre sigaralar arası süre, genel ortalamadan belirgin farklı mı
  {
    const sortedAll = [...smokes].sort((a, b) => a.timestamp - b.timestamp);
    const overallAvg = calculateAverageInterval(
      calculateSmokingIntervals(sortedAll.map((s) => s.timestamp))
    );

    if (overallAvg !== null && overallAvg > 0) {
      for (const reason of SMOKE_REASONS) {
        const list = smokes
          .filter((s) => s.reason === reason.id)
          .sort((a, b) => a.timestamp - b.timestamp);
        if (list.length < MIN_FOR_REASON_PATTERN) continue;

        const avg = calculateAverageInterval(
          calculateSmokingIntervals(list.map((s) => s.timestamp))
        );
        if (avg === null) continue;

        const diffRatio = (avg - overallAvg) / overallAvg;
        if (diffRatio <= -0.3) {
          insights.push({
            id: `interval-short-${reason.id}`,
            text: `${reason.label} kaynaklı sigaralar arasında geçen süre, genel ortalamana göre belirgin şekilde kısa — bu sana tanıdık geliyor mu?`,
          });
        } else if (diffRatio >= 0.3) {
          insights.push({
            id: `interval-long-${reason.id}`,
            text: `${reason.label} kaynaklı sigaralar arasında geçen süre, genel ortalamana göre belirgin şekilde uzun — bu sana tanıdık geliyor mu?`,
          });
        }
      }
    }
  }

  // 7) En uzun sigarasız süreye dair bir yansıma
  {
    const sortedAll = [...smokes].sort((a, b) => a.timestamp - b.timestamp);
    const longest = calculateLongestSmokeFreeInterval(
      calculateSmokingIntervals(sortedAll.map((s) => s.timestamp))
    );
    if (longest !== null && longest >= 360 && total >= MIN_FOR_LONGEST_GAP) {
      insights.push({
        id: "longest-gap",
        text: `En uzun sigarasız süren ${formatMinutesAsDuration(
          longest
        )} sürmüş — o sırada neler farklıydı, hatırlıyor musun?`,
      });
    }
  }

  return insights;
}

/** Basit, deterministik bir string hash (gün başına sabit seçim için). */
function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * O gün için gösterilecek TEK yorumu seçer. Aynı gün içinde (hangi cihazdan
 * bakılırsa bakılsın) aynı sonucu verir; gün değişince yeniden hesaplanır.
 * Firestore'a yazmaya gerek yoktur — tamamen "bugünün tarihi" + "eldeki veri"
 * üzerinden deterministik olarak hesaplanır.
 */
export function selectDailyInsight(
  smokes: InsightSmoke[],
  today: string
): Insight | null {
  const candidates = collectInsights(smokes).sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  );
  if (candidates.length === 0) return null;

  const index = hashString(today) % candidates.length;
  return candidates[index];
}
