KargoPilot 1.1.0 — koyu tema, hareket ekranı, bildirim altyapısı ve harita.

- Açık / koyu / sistem teması; seçim kalıcıdır.
- Kişisel 17TRACK API anahtarıyla durum ve hareket geçmişi. Anahtar cihazda Android Keystore ile şifrelenir; APK’ya, GitHub’a veya yedeğe konmaz.
- Android bildirim izni, test bildirimi ve yaklaşık 6 saatte bir dönüşümlü arka plan kontrolü. Yeni durum/hareket tekrar bildirilmez.
- OpenStreetMap üzerinde sağlayıcının gönderdiği hareket koordinatları; koordinat yoksa boş durum ve isteğe bağlı yer adı araması. Anlık kurye GPS’i değildir.
- 31 gerçek PNG marka görseli. 21 görselin en uzun kenarı en az 512 piksel; diğerleri büyütülmemiş orijinal çözünürlüktedir. Görseli doğrulanamayan firmalarda harf simgesi vardır.
- İsteğe bağlı posta kodu ve telefon son 4 hane alanları, eski kayıt/yedek uyumluluğu ve hata halinde son hareketin korunması.

**API hesabı olmadan:** Gönderi kaydı ve resmî sitede sorgulama çalışır. Otomatik hareket sorgusu ve ona bağlı durum bildirimleri için desteklenen firma ve uygun kotaya sahip kişisel 17TRACK hesabı gerekir.

**Doğrulama:** 9 Java birim testi, arayüz iş akışları, iki tema × dört ekran genişliği, Android derlemesi, lint ve APK imza kontrolü. Arayüz canlı hareket testleri sentetik yanıtlarla yapıldı. API hesabı/anahtarı olmadığı için gerçek gönderinin hareketleri doğrulanamadı. Uygun emülatör olmadığından gerçek cihazda bildirim, izin istemi ve Keystore çalışma zamanı test edilmedi.

**İndir:** `KargoPilot.apk` · Android 6.0+ ve güncel Android System WebView. Mevcut uygulama aynı imza anahtarıyla güncellenebilir.
