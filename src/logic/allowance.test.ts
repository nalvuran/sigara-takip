import { describe, it, expect } from "vitest";
import {
  calculateDailyAllowance,
  calculateRemainingAllowance,
  buildDailyLedger,
  calculateCostPerCigarette,
  calculateDailyCost,
  calculateSavings,
  calculateSmokingIntervals,
  calculateAverageInterval,
  resolveBaseLimitForDate,
} from "./allowance";

describe("Hak/Devir Motoru - Zorunlu Testler (bölüm 24)", () => {
  it("TEST 1: Limit=10, Bugün=8 içildi -> Yarın hak=12", () => {
    const ledger = buildDailyLedger([
      { date: "2026-09-18", baseLimit: 10, consumption: 8 },
      { date: "2026-09-19", baseLimit: 10, consumption: 0 },
    ]);
    expect(ledger[1].allowance).toBe(12);
  });

  it("TEST 2: Limit=10, Bugün=13 içildi -> Yarın hak=7", () => {
    const ledger = buildDailyLedger([
      { date: "2026-09-18", baseLimit: 10, consumption: 13 },
      { date: "2026-09-19", baseLimit: 10, consumption: 0 },
    ]);
    expect(ledger[1].allowance).toBe(7);
  });

  it("TEST 5: Limit=10, Bugün=10 içildi -> Yarın hak=10 (tam kullanım, devir yok)", () => {
    const ledger = buildDailyLedger([
      { date: "2026-09-18", baseLimit: 10, consumption: 10 },
      { date: "2026-09-19", baseLimit: 10, consumption: 0 },
    ]);
    expect(ledger[1].allowance).toBe(10);
  });

  it("TEST 4: Limit=10, Gün1=13, Gün2=5 -> Gün3 hak=12 (ÖRNEK 4 ile birebir)", () => {
    const ledger = buildDailyLedger([
      { date: "2026-09-17", baseLimit: 10, consumption: 13 },
      { date: "2026-09-18", baseLimit: 10, consumption: 5 },
      { date: "2026-09-19", baseLimit: 10, consumption: 0 },
    ]);
    expect(ledger[0].remaining).toBe(-3);
    expect(ledger[1].allowance).toBe(7);
    expect(ledger[1].remaining).toBe(2);
    expect(ledger[2].allowance).toBe(12);
  });

  it("TEST 3 (ÖRNEK 2 ile birebir doğrulama): Limit=10, Gün1=8, Gün2=7 -> Gün3 hak=15", () => {
    // NOT: Spesifikasyonun 24. bölümündeki "TEST 3" metninde üçüncü gün hakkı
    // 13 olarak yazılmış, ancak bu, spesifikasyonun kendi formülüyle (bölüm 6)
    // ve ÖRNEK 2'nin adım adım çözümüyle (bölüm 5) çelişiyor:
    //   Gün1: 10 -8  = 2 kalan
    //   Gün2: 10+2=12 hak, 12-7=5 kalan
    //   Gün3: 10+5=15 hak
    // Kod, tek ve tutarlı formülü (bölüm 6 + ÖRNEK 2) referans alır; bu test
    // o hesaplamayı doğrular. Gerçek değer 13 olması gerekiyorsa lütfen
    // teyit edin, formülü buna göre güncelleriz.
    const ledger = buildDailyLedger([
      { date: "2026-09-17", baseLimit: 10, consumption: 8 },
      { date: "2026-09-18", baseLimit: 10, consumption: 7 },
      { date: "2026-09-19", baseLimit: 10, consumption: 0 },
    ]);
    expect(ledger[0].remaining).toBe(2);
    expect(ledger[1].allowance).toBe(12);
    expect(ledger[1].remaining).toBe(5);
    expect(ledger[2].allowance).toBe(15);
  });
});

describe("calculateDailyAllowance / calculateRemainingAllowance", () => {
  it("temel toplama işlemini doğru yapar", () => {
    expect(calculateDailyAllowance(10, 2)).toBe(12);
    expect(calculateDailyAllowance(10, -3)).toBe(7);
  });

  it("negatif remaining üretebilir (borç)", () => {
    expect(calculateRemainingAllowance(10, 13)).toBe(-3);
  });
});

describe("Limit değişikliği geçmişi", () => {
  it("değişiklik tarihinden önceki günlerde eski limiti kullanır", () => {
    const history = [{ newLimit: 8, effectiveFrom: "2026-09-15" }];
    expect(resolveBaseLimitForDate("2026-09-10", 10, history)).toBe(10);
    expect(resolveBaseLimitForDate("2026-09-15", 10, history)).toBe(8);
    expect(resolveBaseLimitForDate("2026-09-20", 10, history)).toBe(8);
  });

  it("birden fazla değişiklikte en güncel uygulanabilir olanı seçer", () => {
    const history = [
      { newLimit: 8, effectiveFrom: "2026-09-15" },
      { newLimit: 7, effectiveFrom: "2026-09-20" },
    ];
    expect(resolveBaseLimitForDate("2026-09-18", 10, history)).toBe(8);
    expect(resolveBaseLimitForDate("2026-09-25", 10, history)).toBe(7);
  });
});

describe("Maliyet ve tasarruf hesapları", () => {
  it("sigara başı maliyeti doğru hesaplar", () => {
    expect(calculateCostPerCigarette(350, 20)).toBeCloseTo(17.5);
  });

  it("günlük harcamayı doğru hesaplar", () => {
    expect(calculateDailyCost(3, 17.5)).toBeCloseTo(52.5);
  });

  it("tasarrufu sadece temel limite göre, negatifken 0 olarak hesaplar", () => {
    expect(calculateSavings(10, 7, 17.5)).toBeCloseTo(52.5); // 3 içilmedi
    expect(calculateSavings(10, 13, 17.5)).toBe(0); // aşım var, tasarruf yok
  });
});

describe("Sigara aralıkları", () => {
  it("ardışık zaman damgalarından dakika cinsinden aralık üretir", () => {
    const base = new Date("2026-09-18T09:15:00+03:00").getTime();
    const t1 = base;
    const t2 = base + 2.5 * 3600 * 1000; // +2s30dk
    const t3 = t2 + 2.5833 * 3600 * 1000; // ~+2s35dk
    const intervals = calculateSmokingIntervals([t1, t2, t3]);
    expect(intervals[0]).toBeCloseTo(150, 0);
    expect(intervals[1]).toBeCloseTo(155, 0);
    expect(calculateAverageInterval(intervals)).toBeCloseTo(152.5, 0);
  });

  it("tek kayıt veya kayıt yoksa ortalama null döner", () => {
    expect(calculateAverageInterval([])).toBeNull();
    expect(calculateSmokingIntervals([123456])).toEqual([]);
  });
});
