import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  runTransaction,
  getDocs,
  writeBatch,
  limit as fsLimit,
} from "firebase/firestore";
import { db } from "./firebase";
import type { UserSettings, SmokeRecord, DailyLedgerEntry } from "../types";
import {
  calculateDailyAllowance,
  calculateRemainingAllowance,
} from "../logic/allowance";
import { toLocalDateString, addDaysToDateString } from "../logic/dateUtils";

const DEFAULT_SETTINGS: Omit<UserSettings, "createdAt" | "updatedAt"> = {
  dailyLimit: 10,
  cigarettesPerPack: 20,
  packagePrice: 350,
};

// ---------- Kullanıcı Ayarları ----------

export async function ensureUserDocument(uid: string): Promise<void> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      ...DEFAULT_SETTINGS,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }
}

export function subscribeUserSettings(
  uid: string,
  callback: (settings: UserSettings | null) => void
) {
  const ref = doc(db, "users", uid);
  return onSnapshot(ref, (snap) => {
    callback(snap.exists() ? (snap.data() as UserSettings) : null);
  });
}

export async function updateUserSettings(
  uid: string,
  partial: Partial<Pick<UserSettings, "cigarettesPerPack" | "packagePrice">>
): Promise<void> {
  const ref = doc(db, "users", uid);
  await setDoc(ref, { ...partial, updatedAt: Date.now() }, { merge: true });
}

// ---------- Limit Geçmişi ----------
// Limit değişikliği "geleceğe etkili" olarak kaydedilir: bugünden itibaren
// geçmiş günlerin hesaplamaları bozulmaz (spesifikasyon bölüm 17).

export async function changeDailyLimit(
  uid: string,
  newLimit: number,
  effectiveFrom: string
): Promise<void> {
  if (newLimit <= 0) {
    throw new Error("Günlük limit sıfır veya daha küçük olamaz.");
  }
  const ref = collection(db, "users", uid, "limitHistory");
  await addDoc(ref, {
    newLimit,
    effectiveFrom,
    createdAt: Date.now(),
  });
}

export function subscribeLimitHistory(
  uid: string,
  callback: (history: { id: string; newLimit: number; effectiveFrom: string }[]) => void
) {
  const ref = collection(db, "users", uid, "limitHistory");
  const q = query(ref, orderBy("effectiveFrom", "asc"));
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => ({
        id: d.id,
        newLimit: d.data().newLimit,
        effectiveFrom: d.data().effectiveFrom,
      }))
    );
  });
}

// ---------- Günlük Hak Defteri (Ledger) ----------

function ledgerRef(uid: string, date: string) {
  return doc(db, "users", uid, "dailyLedger", date);
}

export function subscribeLedgerEntry(
  uid: string,
  date: string,
  callback: (entry: DailyLedgerEntry | null) => void
) {
  return onSnapshot(ledgerRef(uid, date), (snap) => {
    callback(snap.exists() ? (snap.data() as DailyLedgerEntry) : null);
  });
}

export function subscribeLedgerRange(
  uid: string,
  fromDate: string,
  toDate: string,
  callback: (entries: DailyLedgerEntry[]) => void
) {
  const ref = collection(db, "users", uid, "dailyLedger");
  const q = query(
    ref,
    where("date", ">=", fromDate),
    where("date", "<=", toDate),
    orderBy("date", "asc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => d.data() as DailyLedgerEntry));
  });
}

/**
 * Bugünün ledger kaydını garanti eder: yoksa dünün remaining'ini alıp oluşturur.
 * Firestore transaction kullanır ki iki cihaz aynı anda ilk kaydı oluşturmaya
 * çalışırsa çakışma/veri kaybı olmasın.
 */
export async function ensureTodayLedger(
  uid: string,
  today: string,
  baseLimit: number
): Promise<void> {
  const yesterday = addDaysToDateString(today, -1);
  const todayRef = ledgerRef(uid, today);
  const yesterdayRef = ledgerRef(uid, yesterday);

  await runTransaction(db, async (tx) => {
    const todaySnap = await tx.get(todayRef);
    if (todaySnap.exists()) return; // zaten var, dokunma

    const yesterdaySnap = await tx.get(yesterdayRef);
    const previousRemaining = yesterdaySnap.exists()
      ? (yesterdaySnap.data() as DailyLedgerEntry).remaining
      : 0;

    const allowance = calculateDailyAllowance(baseLimit, previousRemaining);

    const entry: DailyLedgerEntry = {
      date: today,
      baseLimit,
      previousRemaining,
      allowance,
      consumption: 0,
      remaining: allowance,
      isFinalized: false,
      updatedAt: Date.now(),
    };
    tx.set(todayRef, entry);

    // Dünün kaydı finalize edilmemişse (örn. uygulama hiç açılmadıysa) finalize et.
    if (yesterdaySnap.exists() && !yesterdaySnap.data().isFinalized) {
      tx.update(yesterdayRef, { isFinalized: true });
    }
  });
}

// ---------- Sigara Ekleme / Geri Alma ----------

/**
 * Yeni bir sigara kaydı ekler ve bugünün ledger'ını atomik şekilde günceller.
 * İki cihaz aynı anda basarsa transaction sayesinde consumption doğru artar.
 */
export async function addSmoke(
  uid: string,
  baseLimit: number,
  dayStartHour = 0
): Promise<string> {
  const now = Date.now();
  const today = toLocalDateString(now, dayStartHour);

  await ensureTodayLedger(uid, today, baseLimit);

  const smokesRef = collection(db, "users", uid, "smokes");
  const newSmokeRef = doc(smokesRef);
  const todayRef = ledgerRef(uid, today);

  await runTransaction(db, async (tx) => {
    const ledgerSnap = await tx.get(todayRef);
    if (!ledgerSnap.exists()) {
      throw new Error("Günlük hak kaydı bulunamadı, tekrar deneyin.");
    }
    const ledger = ledgerSnap.data() as DailyLedgerEntry;
    const newConsumption = ledger.consumption + 1;
    const newRemaining = calculateRemainingAllowance(
      ledger.allowance,
      newConsumption
    );

    tx.set(newSmokeRef, {
      timestamp: now,
      localDate: today,
      createdAt: now,
    });

    tx.update(todayRef, {
      consumption: newConsumption,
      remaining: newRemaining,
      updatedAt: now,
    });
  });

  return newSmokeRef.id;
}

/** Bir sigara kaydını siler ve bugünün ledger'ını buna göre düzeltir. */
export async function undoSmoke(uid: string, smokeId: string): Promise<void> {
  const smokeRef = doc(db, "users", uid, "smokes", smokeId);

  await runTransaction(db, async (tx) => {
    const smokeSnap = await tx.get(smokeRef);
    if (!smokeSnap.exists()) {
      // Zaten silinmiş / geri alınmış - sessizce çık (çift geri almayı engeller).
      return;
    }
    const smoke = smokeSnap.data() as SmokeRecord;
    const todayRef = ledgerRef(uid, smoke.localDate);
    const ledgerSnap = await tx.get(todayRef);

    tx.delete(smokeRef);

    if (ledgerSnap.exists()) {
      const ledger = ledgerSnap.data() as DailyLedgerEntry;
      const newConsumption = Math.max(0, ledger.consumption - 1);
      const newRemaining = calculateRemainingAllowance(
        ledger.allowance,
        newConsumption
      );
      tx.update(todayRef, {
        consumption: newConsumption,
        remaining: newRemaining,
        updatedAt: Date.now(),
      });
    }
  });
}

export function subscribeSmokesForDate(
  uid: string,
  date: string,
  callback: (smokes: SmokeRecord[]) => void
) {
  const ref = collection(db, "users", uid, "smokes");
  const q = query(ref, where("localDate", "==", date), orderBy("timestamp", "asc"));
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as SmokeRecord))
    );
  });
}

export function subscribeSmokesRange(
  uid: string,
  fromDate: string,
  toDate: string,
  callback: (smokes: SmokeRecord[]) => void
) {
  const ref = collection(db, "users", uid, "smokes");
  const q = query(
    ref,
    where("localDate", ">=", fromDate),
    where("localDate", "<=", toDate),
    orderBy("localDate", "asc"),
    orderBy("timestamp", "asc")
  );
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as SmokeRecord))
    );
  });
}

// ---------- Tüm Verileri Sıfırla ----------
// Ayarlar (dailyLimit, packagePrice, cigarettesPerPack) ve hesap KORUNUR.
// smokes, dailyLedger, limitHistory koleksiyonları temizlenir.

async function deleteCollectionInBatches(uid: string, subcollection: string) {
  const ref = collection(db, "users", uid, subcollection);
  // Firestore'da tüm koleksiyonu tek seferde silmek yok; sayfa sayfa siliyoruz.
  // 400'lük gruplar (batch limiti 500, güvenli pay bırakıyoruz).
  while (true) {
    const snap = await getDocs(query(ref, fsLimit(400)));
    if (snap.empty) break;
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    if (snap.size < 400) break;
  }
}

export async function resetAllUserData(uid: string): Promise<void> {
  await deleteCollectionInBatches(uid, "smokes");
  await deleteCollectionInBatches(uid, "dailyLedger");
  await deleteCollectionInBatches(uid, "limitHistory");
}
