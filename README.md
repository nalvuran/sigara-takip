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

> **Not:** Orijinal spesifikasyonun 24. bölümündeki "TEST 3" senaryosu (limit=10,
> gün1=8, gün2=7 -> gün3 hakkı **13**) ile 5. bölümdeki ÖRNEK 2'nin adım adım
> çözümü (aynı senaryo için sonuç **15**) birbiriyle çelişiyor. Uygulama, tek ve
> tutarlı formülü (bölüm 6) ve ÖRNEK 2'yi referans alarak **15**'i doğru kabul
> eder. Bu netleştirilmesi gereken bir noktadır.

## Bilinen sınırlamalar / sonraki adımlar (Aşama 3)
- PWA manifest'i eklendi ancak `public/icon-192.png` ve `public/icon-512.png`
  dosyaları henüz yok — gerçek uygulama ikonlarıyla eklenmeli.
- Hedef sistemi, başarılar ve gelişmiş grafikler henüz eklenmedi.
- `dailyLedger` kayıtları uygulama açıldığında proaktif olarak oluşturulur;
  uygulamanın hiç açılmadığı günler için geriye dönük ledger oluşturma
  (backfill) eklenmemiştir.
