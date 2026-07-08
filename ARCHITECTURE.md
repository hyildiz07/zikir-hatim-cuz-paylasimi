# Architecture

Zikir, Hatim & Cüz Paylaşımı uygulaması Netlify üzerinde PWA olarak çalışır ve Android tarafında TWA ile Google Play'e bağlanır.

## Ana parçalar

- `index.html`: tek sayfa uygulama
- `service-worker.js`: PWA cache
- `manifest.json`: PWA manifest
- `assetlinks.json`: Android TWA domain doğrulaması
- `netlify/functions/org.mjs`: hatim/cüz organizasyon backend fonksiyonu

## Saklama ayrımı

- GitHub: kaynak ve public deploy dosyaları
- Drive/kasa: AAB, APK, signing key, şifre ve master arşivler
