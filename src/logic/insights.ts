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
 *   - önce gözlemi nötr, düz bir cümleyle söyler ("X, Y saatlerinde yoğunlaşıyor")
 *   - ardından ayrı bir satırda, kullanıcıyı kendi içine bakmaya davet eden
 *     kısa, açık uçlu bir soru sorar (evet/hayır cevabı gerektirmeyen)
 * Anlamlı olması için her örüntünün belirli bir minimum veri eşiği vardır;
 * eşik geçilmeden o örüntü hiç önerilmez (yanıltıcı erken çıkarım riski).
 */

export interface InsightSmoke {
  timestamp: number;
  localDate: string;
  reason?: string | null;
}

/** Bir örüntü adayı: nötr bir gözlem + bu gözleme eşlik edebilecek düşündürücü sorular. */
export interface Insight {
  id: string;
  observation: string;
  questions: string[];
}

/** O gün gösterilecek nihai yorum: gözlem + (günün) tek sorusu. */
export interface DailyInsight {
  id: string;
  observation: string;
  question: string;
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
        observation: `${reason.label} kaynaklı sigaraların çoğu ${topBucket} saatlerinde.`,
        questions: [
          "O saatlerde günün içinde neler oluyor?",
          "O anlarda sigara sana ne veriyor gibi hissediyorsun?",
          "O saatlerde sana ne iyi gelirdi?",
        ],
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
        observation: `${reason.label} kaynaklı sigaraların büyük kısmı hafta sonlarına denk geliyor.`,
        questions: [
          "Hafta sonlarını hafta içinden ayıran ne?",
          "O günlerde kimlerle, nerede oluyorsun?",
          "O günler sana nasıl hissettiriyor?",
        ],
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
          observation: `En sık işaretlediğin neden "${def.label}".`,
          questions: [
            "Bunun altında ne yatıyor olabilir?",
            "Bu neden hayatının başka hangi yerlerinde karşına çıkıyor?",
            "Bu ihtiyaca başka neler cevap verebilir?",
          ],
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
        observation: `Sigaraların ${topDay} günlerinde daha sık kümelenmiş görünüyor.`,
        questions: [
          "O günü diğer günlerden ayıran ne?",
          "O günün akışında neler var?",
          "O gün içinden neler geçiyor?",
        ],
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
          observation: `Günün ilk sigarası genelde saat ${avgHour}:00 civarında oluyor.`,
          questions: [
            "Güne başlarken o anda ne arıyorsun?",
            "Uyandığında ilk hissettiğin şey ne oluyor?",
            "Sabahın o anında sigara sana ne sağlıyor?",
          ],
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
            observation: `${reason.label} kaynaklı sigaralar arasında geçen süre, genel ortalamana göre belirgin şekilde kısa.`,
            questions: [
              "O anlarda içinde neler hızlanıyor?",
              "Hızlanan şey bir ihtiyaç mı, bir alışkanlık mı?",
              "O durumlar seni nasıl bir hâle getiriyor?",
            ],
          });
        } else if (diffRatio >= 0.3) {
          insights.push({
            id: `interval-long-${reason.id}`,
            observation: `${reason.label} kaynaklı sigaralar arasında geçen süre, genel ortalamana göre belirgin şekilde uzun.`,
            questions: [
              "O anlarda seni ne sakin tutuyor?",
              "O durumlarda sigarasız geçen zamanı mümkün kılan ne?",
              "Orada işleyen bir şey varsa, o ne olabilir?",
            ],
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
        observation: `En uzun sigarasız süren ${formatMinutesAsDuration(longest)} sürmüş.`,
        questions: [
          "O sırada neler farklıydı?",
          "O saatlerde ne yapıyordun, kiminleydin?",
          "O süre sana nasıl hissettirdi?",
        ],
      });
    }
  }

  return insights;
}

/** "YYYY-MM-DD" -> 1970'ten beri geçen gün sayısı (ardışık günler ardışık sayılar verir). */
function dayNumber(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
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
): DailyInsight | null {
  const candidates = collectInsights(smokes).sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  );
  if (candidates.length === 0) return null;

  // Ardışık günlerde adaylar sırayla döner; aynı aday tekrar geldiğinde
  // bir sonraki soru gösterilir. Aynı gün her cihazda aynı sonucu verir.
  const day = dayNumber(today);
  const chosen = candidates[day % candidates.length];
  const question =
    chosen.questions[Math.floor(day / candidates.length) % chosen.questions.length];

  return { id: chosen.id, observation: chosen.observation, question };
}
