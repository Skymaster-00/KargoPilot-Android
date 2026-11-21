# Değişiklikler

## 1.1.1

- Firma logoları küçük ve sabit kutulara sığdırıldı. Yüklenmeyen görsellerde firma kısaltması gösteriliyor.
- Yurtiçi Kargo, Trendyol Express, CEVA ve YunExpress logoları eklendi.
- Koyu tema füme yüzeyler ve hafif mavi vurgularla yenilendi.
- Gönderi detayından API hesabı olmadan resmî takip sayfasına veya numarası hazır 17TRACK sorgusuna geçilebiliyor. Kolay Gelsin bağlantısı doğrudan gönderi sorgulama formunu açıyor.

## 1.1.0 — 2026-11-22

- Kalıcı açık / koyu / sistem teması ve uyumlu Android sistem çubukları.
- 17TRACK kayıt / sorgu istemcisi; taşıyıcı durumu, hareket geçmişi, kaynak ve zaman bilgileri.
- Android Keystore ile kişisel API anahtarı saklama; anahtarların yedekten ve kaynak koddan ayrılması.
- Android bildirim kanalı, izin akışı, test bildirimi ve 6 saatlik JobScheduler kontrolü; değişmeyen hareketler için tekrar bildirim engeli.
- Koordinat sağlanan hareketlerin OpenStreetMap haritası; koordinat yoksa açık boş durum.
- 31 kaynaklı PNG marka görseli, isteğe bağlı ek sorgu alanları ve eski yedek uyumluluğu.
- 9 Java birim testi; açık/koyu tema, harita ve servis hata durumları için arayüz testleri.

Gerçek taşıyıcı testi API hesabı sağlanamadığından doğrulanmadı; sentetik yanıt testleri gerçek gönderi sonucu olarak sunulmaz.

## 1.0.2 — 2026-11-21

- GitHub Android SDK kurulumu artık kaldırılan eski `tools` paketini istemiyor; yalnızca gerekli platform araçlarını kuruyor.

## 1.0.1 — 2026-11-21

- GitHub derleme ortamı, Playwright ile uyumlu Ubuntu 24.04 sürümüne sabitlendi.
- Netlog ve CEVA / Borusan resmî bağlantıları güncellendi.
- Güncel resmî adresi doğrulanamayan Kargomsende için açıkça belirtilen 17TRACK alternatifi kullanıldı; sonuç garantisi verilmez.

## 1.0.0 — 2026-11-21

- Türkçe, çevrimdışı çalışan gönderi düzenleme arayüzü.
- Türkiye ve dünyadan 35 firma, 17TRACK seçeneği ve özel HTTPS firma bağlantıları.
- Takip numarası kopyalama ve resmî sorgulama sayfasını tarayıcıda açma.
- Gönderi adları, notlar, düzenleme, arşiv ve kullanıcının teslim işareti.
- Firma arama, favoriler, JSON yedekleme ve geri yükleme.
- İmzalı Android APK ve etiketlerle GitHub Releases yayımlama iş akışı.

Bu sürüm taşıyıcı API’lerinden canlı durum almaz ve otomatik bildirim göndermez.
