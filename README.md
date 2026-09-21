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
- **Hedef sistemi**: Ayarlar'dan hedef günlük limit (+ opsiyonel tarih) belirlenebilir. Ana sayfada ilerleme çubuğu ve "hedefin gerisinde/ilerisinde" durumu gösterilir. Mantık: `src/logic/goals.ts` (test edilmiş).
- **Başarılar**: 8 rozet (seri, tasarruf, sadakat, hedef) — `src/logic/achievements.ts` (test edilmiş), yeni "Başarılar" sekmesinde gösterilir.
- **Gelişmiş grafikler**: İstatistikler ekranına recharts ile günlük tüketim bar grafiği + limit referans çizgisi eklendi.

Yeni Firestore koleksiyonu (`users/{uid}/goal/current`) için güvenlik kuralı `firestore.rules`'a eklendi — canlıya almadan önce tekrar deploy edilmeli:
```bash
firebase deploy --only firestore:rules,hosting
```
