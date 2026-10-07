# Zikir, Hatim & Cüz Paylaşımı

Public-safe GitHub/Netlify paketi.

Bu paket, ELIFA Platform'un **Zikir, Hatim & Cüz Paylaşımı** uygulamasının GitHub'a yüklenebilir temiz sürümüdür.

## Ürün bilgileri

| Alan | Değer |
| --- | --- |
| Play Store adı | `Zikir, Hatim & Cüz Paylaşımı` |
| Android package | `com.elifaplatform.zikirmatik.twa` |
| Platform | PWA + TWA |
| Yayın hedefi | Netlify + Google Play |

## İçerik

- `index.html`
- `gizlilik.html`
- `manifest.json`
- `service-worker.js`
- `assetlinks.json`
- `.well-known/assetlinks.json`
- `netlify/functions/org.mjs`
- ikon dosyaları
- Netlify yapılandırması

## Netlify

```text
Build command: boş
Publish directory: .
Functions directory: netlify/functions
```

## Android sürümü

`android/` içindeki Trusted Web Activity projesi `com.elifaplatform.zikirmatik.twa` paketini açar. Google Play'deki ilk sürümün kodu 1, hedef SDK'sı 35 ve en düşük SDK'sı 23'tür. Buradaki güncelleme sürüm kodu **2**, sürüm adı **1.0.1**, en düşük SDK **23** ve hedef SDK **36** kullanır.

GitHub Actions, `android/twa-manifest.json` dosyasından Android projesini yeniden üretir ve pull request veya elle başlatılan çalıştırmalarda imzasız AAB oluşturur. Play'e yüklemeden önce AAB'yi Play Console'daki etkin yükleme sertifikasıyla eşleşen **mevcut** özel anahtarla yerel ortamda imzalayın. Anahtar veya parolayı depoya ve Actions'a koymayın. Manifestteki `./android.keystore` yalnızca yerel yer tutucudur. Canlı PWA adresi `https://zikirmatik.elifaplatform.com/index.html` olarak korunur.

## GitHub'a konmayacak dosyalar

```text
signing.keystore
signing-key-info.txt
*.aab
*.apk
*.keystore
*.jks
keystore-base64.txt
.env
```

## Güvenlik

Bu paket signing key, keystore, Play Store AAB/APK veya şifre dosyası içermez. Play Store release dosyaları Drive/kasa içinde tutulmalıdır.

