# KargoPilot · Android

Türkçe bir kargo gönderi düzenleyicisi. Takip numaralarını cihazında tutar ve taşıyıcıların resmî sorgulama sayfalarını açar.

[En son APK’yı indir](https://github.com/Skymaster-00/KargoPilot-Android/releases/latest/download/KargoPilot.apk) · [Sürümler](https://github.com/Skymaster-00/KargoPilot-Android/releases) · [İş akışı](https://github.com/Skymaster-00/KargoPilot-Android/actions)

## Özellikler

- 35 firma bağlantısı, ayrıca firma bilinmediğinde 17TRACK.
- Listede olmayan taşıyıcılar veya SMS takip sayfaları için özel HTTPS bağlantısı ekleme. `{num}` yer tutucusu takip numarasıyla değiştirilir.
- Gönderi kaydetme, adlandırma, not, düzenleme, arama, favoriler, arşiv ve elle teslim işaretleme.
- Takip numarasını kopyalayıp resmî sayfayı varsayılan tarayıcıda açma.
- Android dosya seçicisiyle JSON dışa aktarma / geri yükleme; Android paylaşım menüsü.
- Çevrimdışı arayüz, cihazda kayıt, hesap veya reklam yok. İnternet yalnızca açılan haricî takip sayfası için gereklidir.

## Kapsam ve kullanım

Bu APK kargo firmalarından otomatik veri çekmez. **Kaydedildi**, bir taşıma durumu değildir. **Teslim aldım**, kullanıcının işaretidir. Güncel durum, taşıma hareketleri, konum ve teslimat tahmini firmanın kendi sayfasında görüntülenir. Güvenlik kodunu kullanıcı girer. Firma bağlantıları bağımsız bir rehberdir; her firma, site veya numara için sonuç garantisi yoktur.

1. Gönderi ekle; firmanı seç ve takip numaranı yaz.
2. Kaydet veya Kaydet ve sorgula’ya dokun.
3. Açılan resmî sayfaya kopyalanmış numarayı yapıştır, gerekiyorsa güvenlik kodunu gir.
4. Teslim aldığında gönderiyi elle işaretle veya arşivle.

35 firma: Yurtiçi, Aras, DHL eCommerce / MNG, Sürat, PTT, HepsiJET, Trendyol Express, Kolay Gelsin / Sendeo, Kargoist, Kargomsende, AGT, Kuryenet, Bir Günde, Horoz, Borusan, Netlog, Fillo, UPS, FedEx, DHL Express, TNT, USPS, Royal Mail, DPD, GLS, La Poste, Poste Italiane, PostNL, bpost, Canada Post, Australia Post, Swiss Post, Cainiao, YunExpress ve SF Express.

Android 6.0+ ve güncel Android System WebView gerekir. APK’yı telefonda açıp kuruluma izin verin. Uygulamayı silmek cihaz kayıtlarını da siler; önce Ayarlar’dan yedek alın. JSON yedekleri takip numaralarını içerir.

## Geliştirme

Yerel HTML/CSS/JavaScript arayüzü, dış içerik yüklemeyen Android WebView içinde çalışır. Java Activity, yerel kayıt, pano, tarayıcı, paylaşım ve dosya seçici köprüsünü sağlar. Ağ, konum, kamera veya depolama izni istemez. Uzak web siteleri JavaScript köprüsüne erişemez.

Gereksinimler: JDK 17, Android SDK platform 35 + Build Tools 35.0.0, Node 22+.

```sh
npm ci
npx playwright install chromium
npm test
./gradlew :app:assembleDebug :app:lintDebug
```

Windows’ta `gradlew.bat` kullanılır. SDK için `ANDROID_HOME` veya git dışında tutulan `local.properties` ayarlanır. APK: `app/build/outputs/apk/debug/app-debug.apk`.

## İmzalı sürüm yayımlama

Yayımlanan uygulamanın güncellenebilmesi için mevcut imza anahtarını koruyun. Yeni geliştirici kopyalarında `node scripts/init-signing.cjs` yalnızca farklı bir uygulama kimliği oluşturmak isteniyorsa çalıştırılmalıdır. Bu komut mevcut yerel anahtarı değiştirmez. GitHub Actions mevcut anahtarı şifreli repository secrets üzerinden kullanır.

Her düzeltme yeni bir sürüm olarak yayımlanır:

```sh
node scripts/bump-version.cjs 1.0.1
# CHANGELOG.md ve RELEASE_NOTES.md güncellenir.
npm test
./gradlew :app:assembleRelease :app:lintRelease
git add .
git commit -m "Release 1.0.1: describe the fix"
git push origin main
git tag v1.0.1
git push origin v1.0.1
```

`Signed Android APK` iş akışı arayüz testlerini çalıştırır, APK’yı imzalar, lint ve imzayı kontrol eder, `KargoPilot.apk` ile `SHA256SUMS.txt` dosyalarını GitHub Releases’e yükler. `ANDROID_KEYSTORE_BASE64` ve `ANDROID_STORE_PASSWORD` repository secrets gereklidir. İmzalama dosyaları kaynak kodda tutulmaz. En son APK bağlantısı sürümler arasında sabittir.

## Doğrulama ve kaynaklar

`npm test` kalıcı kayıt, doğrulama, çift kayıt engeli, firma seçimi, özel URL doğrulama, teslim işareti, arşiv, silme, arama, favoriler, yedek geri yükleme, HTML kaçışları, klavye dolaşımı ve 4 ekran genişliğini doğrular. Native köprü testlerde taklit edilir. Gerçek Android cihaz testiyle eşdeğer değildir. İlk sürümde cihaz aracı uygun emülatör sunmadığı için cihazda çalıştırma doğrulanamadı.

Firma ve entegrasyon incelemesinde kullanılan resmî kaynaklar: [DHL eCommerce takip](https://www.dhlecommerce.com.tr/gonderitakip), [Kolay Gelsin / Sendeo](https://sendeo.com.tr/), [PTT takip](https://gonderitakip.ptt.gov.tr/), [Sürat takip](https://www.suratkargo.com.tr/KargoTakip), [Aras Kargo](https://www.araskargo.com.tr/), [HepsiJET](https://www.hepsijet.com/), [17TRACK API dokümanı](https://api.17track.net/en/doc). Otomatik canlı takip entegrasyonu için ayrıca yetkili API hesabı ve uygun sunucu mimarisi gerekir; bu sürüm API erişimi içermez.

Manrope yazı tipi [SIL Open Font License](app/src/main/assets/Manrope-OFL.txt) ile dağıtılır. Firma adları ilgili sahiplerine aittir; ticari ortaklık ima edilmez.
