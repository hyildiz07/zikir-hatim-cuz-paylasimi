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
