# KargoPilot · Android

Türkçe kargo takip uygulaması: koyu/açık tema, yerel gönderi kayıtları, 17TRACK bağlantısıyla hareket geçmişi, durum bildirimleri ve hareket haritası.

[En son APK’yı indir](https://github.com/Skymaster-00/KargoPilot-Android/releases/latest/download/KargoPilot.apk) · [Sürümler](https://github.com/Skymaster-00/KargoPilot-Android/releases) · [Derleme iş akışı](https://github.com/Skymaster-00/KargoPilot-Android/actions)

## 1.1.0 özellikleri

- Kalıcı açık, koyu ve sistem teması; Android sistem çubuklarıyla uyum.
- 35 firma seçeneği, 17TRACK alternatifi ve özel HTTPS takip bağlantıları.
- Gönderi kaydetme, adlandırma, notlar, arama, favoriler, düzenleme, arşiv ve elle teslim işaretleme.
- Kişisel 17TRACK API anahtarıyla uygulama içinde taşıyıcı durumu ve hareket geçmişi. Kaynak taşıyıcı adı, hareket zamanı ve son sorgu zamanı ayrı gösterilir. Hatalarda önceki kayıt korunur.
- Android bildirim izni, bildirim kanalı, açıkça etiketlenen test bildirimi ve yaklaşık 6 saatte bir arka plan kontrolü. Aynı veri tekrar bildirilmez. Her çalışmada en çok 10 aktif gönderi dönüşümlü işlenir; Android pil/ağ koşulları kontrolü geciktirebilir.
- OpenStreetMap üzerinde yalnızca servis tarafından sağlanan hareket koordinatları. Koordinat yoksa boş durum ve isteğe bağlı yer adı araması. Rastgele pin veya kurye GPS simülasyonu yoktur.
- 31 gerçek PNG marka görseli; 18 vektör kaynaktan rasterleştirilmiş, 21 görselin en uzun kenarı en az 512 pikseldir. Küçük orijinaller büyütülmedi. Doğrulanmış görseli olmayan seçeneklerde harf simgesi kullanılır. Kaynaklar ve boyutlar: [logos/sources.json](app/src/main/assets/logos/sources.json).
- Android dosya seçicisiyle JSON dışa aktarma / geri yükleme ve sistem paylaşım menüsü.

## Canlı takibin koşulları

**Bu APK ortak bir API anahtarı içermez.** Kullanıcı Ayarlar → Canlı takip bağlantısı bölümünden kendi 17TRACK Security Key değerini girer. Anahtar Android Keystore AES-GCM ile şifrelenerek saklanır; arayüzden geri okunamaz, JSON yedeğine ve GitHub’a eklenmez. Bu yaklaşım kişisel API hesabıyla kullanım içindir. Çok kullanıcılı ticari dağıtımda ortak servis anahtarı sunucuda tutulmalıdır.

İlk sorguda henüz kayıtlı olmayan gönderi `register` ile API hesabına kaydedilir; standart gönderiler hesap kotasını kullanabilir. Sonraki sorgular `gettrackinfo` ile servis verisini okur. Uygulama pahalı “Instant” sorgularını çağırmaz. Aynı gönderiye 60 saniye içinde yapılan tekrar dokunuşları önbellekten karşılanır. İlk kayıt sonrasında sonuçların oluşması zaman alabilir. Bildirimler ve harita, taşıyıcının sağladığı verilere bağlıdır; anlık GPS veya her firmaya erişim garantisi değildir.

Firma kodları [17TRACK’in resmî listesi](https://res.17track.net/asset/carrier/info/apicarrier.all.json) ile eşleştirilmiştir. API desteği doğrulanmamış firmalarda açık hata ve resmî site alternatifi gösterilir. Firma bilinmiyorsa otomatik algılama denenebilir; aynı biçimdeki takip numaraları farklı firmalara ait olabildiğinden sonuçtaki taşıyıcı adı kontrol edilmelidir. Bazı firmalar için alıcı posta kodu / telefonun son 4 hanesi gerekir; bunlar gönderi formunda isteğe bağlıdır.

API hesabı yoksa yerel gönderi kaydı ve resmî sorgulama sayfası özelliği kullanılabilir; otomatik hareket sorgusu ve buna bağlı bildirimler etkinleşmez. “Kaydedildi” bir kargo hareketi, “Teslim aldım” ise servis doğrulaması değildir.

## Gizlilik ve harita

Kayıtlar cihazın uygulama alanında tutulur. Canlı sorgu takip numarasını ve kullanıcının girdiği ek sorgu bilgilerini 17TRACK’e iletir. Harita açıldığında OpenStreetMap kareleri internetten yüklenir; konum izni istenmez. Koordinatsız bir hareket için kullanıcı yer adı aramasını seçerse o yer adı OpenStreetMap aramasına gönderilir. Üçüncü taraf web siteleri uygulamanın JavaScript köprüsünü alamaz.

API anahtarı ve servis önbelleği yedeğe dahil değildir. JSON yedeği takip numaraları, notlar, tema tercihi ve girilmiş ek sorgu bilgilerini içerir. Uygulama kaldırılırsa cihaz kayıtları silinir; önce yedek alın. İşletim sistemi yedeklemesi ve cihazlar arası otomatik veri aktarımı kapalıdır.

Android 6.0+ ve güncel Android System WebView gerekir. APK aynı imza anahtarıyla güncellenir.

## Geliştirme ve test

Gereksinimler: JDK 17, Android SDK 35 + Build Tools 35.0.0, Node 22+.

```sh
npm ci
npx playwright install chromium
npm test
./gradlew :app:assembleDebug :app:lintDebug :app:testDebugUnitTest
```

Windows’ta `gradlew.bat` kullanılır. SDK için `ANDROID_HOME` veya git dışında tutulan `local.properties` ayarlanır. Üretim APK’sı için mevcut imza anahtarı korunmalıdır.

`npm test` yerel kayıt akışlarına ek olarak tema kalıcılığı, eski yedek uyumluluğu, API anahtarının yedeğe eklenmemesi, izin reddi arayüzü, bildirim köprüsü, hareket ekranı, koordinat var/yok durumları ve hata sonrasında son verinin korunmasını açık/koyu temalarda 320, 390, 412 ve 768 piksel genişliklerde test eder. Native köprü ve taşıyıcı yanıtları bu testlerde **sentetiktir**; ekran görüntülerinde TEST VERİSİ etiketi vardır. Harita kareleri de testte yerel görüntüyle taklit edilir.

9 Java birim testi gerçek üretim ayrıştırıcısını ve istemci akışını doğrular: abonelik, ek alanlar, tekrar kayıt yapmadan okuma, reddedilen sorgular, UTC/saat dilimi sıralama, yinelenen hareketlerin birleştirilmesi, eksik/geçersiz koordinatlar, yinelenmeyen bildirim kararı ve gönderi değiştiğinde önbellek kimliğinin geçersizleşmesi.

1.1.0’da gerçek bir 17TRACK hesabı/anahtarı sağlanmadığı için gerçek gönderi üzerinde API sorgusu doğrulanamadı. Tarayıcı otomasyonu erişimi de başarısız oldu; kullanıcının gönderisinin güncel durumu öğrenilmiş gibi sunulmadı. Cihaz aracı uygun emülatör sunmadığı için APK’nın gerçek cihazda çalıştırılması, Android izin istemi, Keystore çalışma zamanı ve gerçek bildirim teslimi doğrulanamadı. Derleme, lint, arayüz ve birim testi sonuçları bunlardan ayrı raporlanır.

## Yeni APK sürümü yayımlama

Her düzeltme yeni sürüm olarak GitHub’a yüklenir:

```sh
node scripts/bump-version.cjs 1.1.1
# CHANGELOG.md ve RELEASE_NOTES.md güncellenir.
npm test
./gradlew :app:assembleRelease :app:lintRelease :app:testReleaseUnitTest
git add .
git commit -m "Release 1.1.1: describe the fix"
git push origin main
git tag v1.1.1
git push origin v1.1.1
```

`Signed Android APK` iş akışı testleri çalıştırır, imzalı APK’yı oluşturur ve `KargoPilot.apk` ile `SHA256SUMS.txt` dosyalarını Releases’e ekler. İmzalama için `ANDROID_KEYSTORE_BASE64` ve `ANDROID_STORE_PASSWORD` repository secrets kullanılır. Bunlar taşıyıcı API anahtarı değildir. En son APK bağlantısı sürümler arasında sabittir.

## Kaynaklar

- [17TRACK API dokümanı](https://api.17track.net/en/doc)
- [Android bildirim izni](https://developer.android.com/develop/ui/views/notifications/notification-permission)
- [Android Keystore](https://developer.android.com/privacy-and-security/keystore)
- [OpenStreetMap tile kullanım politikası](https://operations.osmfoundation.org/policies/tiles/)
- [Leaflet lisansı](app/src/main/assets/vendor/leaflet/LICENSE)
- [Manrope SIL Open Font License](app/src/main/assets/Manrope-OFL.txt)

Firma adları ve görselleri ilgili sahiplerine aittir; ticari ortaklık veya kurumsal onay ima edilmez.
