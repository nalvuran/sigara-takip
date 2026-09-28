# 🚬 Sigara Takip

Günlük sigara tüketimini, kalan hakkını ve maliyetini takip eden, yargılamayan bir web uygulaması.

## Teknolojiler
React 19 + TypeScript + Vite · Tailwind CSS v4 · Firebase (Auth + Firestore) · React Router · Vitest

## Kurulum

```bash
npm install
cp .env.example .env   # Firebase Console'dan aldığın değerleri gir
npm run dev
```

### Firebase projesi hazırlığı
1. Firebase Console'da (console.firebase.google.com) yeni proje oluştur.
2. **Authentication** → Email/Password ve (istersen) Google sağlayıcısını etkinleştir.
3. **Firestore Database**'i oluştur (production mode).
4. Proje ayarlarından bir Web App ekle, aldığın config değerlerini `.env` dosyasına yapıştır.
5. Güvenlik kurallarını ve index'leri deploy et:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add   # proje ID'ni seç
   firebase deploy --only firestore:rules,firestore:indexes
   ```

### Yayınlama (Firebase Hosting)
```bash
npm run build
firebase deploy --only hosting
```

## Komutlar
- `npm run dev` — geliştirme sunucusu
- `npm run build` — production build (`tsc -b && vite build`)
- `npx vitest run` — hak/devir motoru unit testleri
- `npx vitest` — watch modunda testler

## Proje yapısı
```
src/
  logic/        Saf iş mantığı (hak/devir motoru, tarih yardımcıları) — UI'dan bağımsız, test edilmiş
  services/     Firebase (auth, firestore) erişim katmanı
  hooks/        React hook'ları (canlı veri aboneliği)
  screens/      Ana Sayfa, İstatistik, Geçmiş, Ayarlar, Giriş
  components/   Paylaşılan UI bileşenleri (buton, kart, alt navigasyon)
```

## Hak/Devir Mantığı
```
allowance(gün) = baseLimit(gün) + previousDayRemaining
remaining(gün) = allowance(gün) - consumption(gün)
```
`remaining` pozitifse ertesi güne devreder, negatifse borç olarak düşülür. Detaylı
açıklama ve testler için `src/logic/allowance.ts` ve `src/logic/allowance.test.ts`.

> **Not (çözüldü):** Orijinal spesifikasyonun 24. bölümündeki "TEST 3" senaryosu
> (limit=10, gün1=8, gün2=7 -> gün3 hakkı 13) ile 5. bölümdeki ÖRNEK 2'nin adım
> adım çözümü (aynı senaryo için sonuç 15) birbiriyle çelişiyordu. Kullanıcıyla
> netleştirildi: **doğru sonuç 15**, formül ve testler buna göre doğrulandı.

## Bilinen sınırlamalar / sonraki adımlar
- Build boyutu ~1.36 MB (recharts eklenince büyüdü) — istenirse code-splitting ile küçültülebilir, acil değil.
- `dailyLedger` kayıtları uygulama açıldığında proaktif olarak oluşturulur;
  uygulamanın hiç açılmadığı günler için geriye dönük ledger oluşturma
  (backfill) eklenmemiştir.

## Aşama 3 — Tamamlananlar
- **PWA ikonları**: `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png` gerçek ikonlarla dolduruldu (kaynak: `scripts/icon-source.svg`).
- **Yorumlar**: İstatistikler ekranının üstünde günde 1 kez değişen, kullanıcının kendi verisinden üretilen yansıtıcı bir soru ("…bu sana tanıdık geliyor mu?"). Yargılamaz, öğüt vermez. Mantık: `src/logic/insights.ts` (test edilmiş).
- **Geçmişe manuel ekleme**: Geçmiş ekranındaki "+ Ekle" ile unutulan bir sigara, geçmiş bir tarih/saat seçilerek (en fazla 365 gün geriye) eklenebilir. Ekleme, o günden bugüne kadar olan hak zincirini tek bir Firestore transaction'ında yeniden hesaplar. Her kaydın yanındaki çöp kutusu simgesiyle geçmiş kayıtlar onay sorularak silinebilir; silme de aynı şekilde hak zincirini transaction içinde yeniden hesaplar. Mantık: `recomputeLedgerChain` (`src/logic/allowance.ts`, test edilmiş).
- **Ekran düzeni**: Ana Sayfa'da sayaç, 🚭 butonu, zaman filtreli istatistik kartları ve günlük tüketim grafiği bulunur; İstatistikler ekranı yorum ve örüntü ekranıdır (Bugünün yorumu + emojili "Neden içtin?" dağılımı).
- **Gelişmiş grafikler**: İstatistikler ekranına recharts ile günlük tüketim bar grafiği + limit referans çizgisi eklendi.
- **İçme sebebi takibi**: 🚭 butonuna basınca alttan açılan bir sheet ile (opsiyonel) "Neden içtin?" sorulur — Stres / Keyif / Sosyal / Alışkanlık / Sıkıntı. İstatistikler'de sebep dağılımı ve nötr, salt bilgilendirici bir özet cümlesi ("En sık nedenin: ...") gösterilir. Mantık: `src/logic/reasons.ts` (test edilmiş). Uygulama hiçbir öneri/öğüt vermez, sadece örüntüyü gösterir.

## Kaldırılan özellikler (bilinçli tasarım kararı)
- **Hedef sistemi** tamamen kaldırıldı — kullanıcıyı azaltmaya yönlendiren bir "hedef/ilerleme" çerçevesi, uygulamanın yargısız-ayna felsefesiyle çelişiyordu.
- **"İçilmeyen sigaraların değeri" (TL) kartı** kaldırıldı (Ana Sayfa ve İstatistikler) — bu hesap otomatik olarak "az içmek = kazanç" mesajı veriyordu. Sadece nötr "bugünkü/toplam harcama" bilgisi kaldı.
- **Başarılar (rozet) sistemi** kaldırıldı — bazı rozetler sigara içmeyi ilerleme gibi gösteriyordu; farkındalık işini Yorumlar bölümü üstleniyor. Eski `users/{uid}/meta/flags` kayıtları Firestore'da zararsız şekilde kalabilir.

