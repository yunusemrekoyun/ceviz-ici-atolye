# Ceviz İçi — Proje Arşivi

Ceviz İçi ekibinin inceleme ve geliştirme çalışmaları için 12 projenin tek repoda toplanmış kaynak kopyaları.

## İndir

GitHub erişimi verilen hesabınızla giriş yaptıktan sonra bu repoyu tek seferde indirebilirsiniz.

```bash
git clone https://github.com/yunusemrekoyun/ceviz-ici-atolye.git
cd ceviz-ici-atolye
```

Git kullanmadan indirmek için GitHub'da **Code → Download ZIP** seçin veya [ZIP indir](https://github.com/yunusemrekoyun/ceviz-ici-atolye/archive/refs/heads/main.zip) bağlantısını açın. Gizli repoya erişimi olmayan hesaplar indirme bağlantısını kullanamaz.

## Projeler

| Proje | Kapsam | Teknolojiler |
|---|---|---|
| 1. [Babil Yalıtım](projeler/babil-yalitim/) | Kurumsal site ve içerik yönetimi | React / Express / MongoDB |
| 2. [Oldsocks](projeler/oldsocks/) | E-ticaret | React / Express / MongoDB |
| 3. [Kızıltüy Çini](projeler/kiziltuy-cini/) | Ürün vitrini ve blog | React / Express / MongoDB |
| 4. [Ceplife](projeler/ceplife/) | E-ticaret ve servis yönetimi | Next.js / MongoDB |
| 5. [Otel Rezervasyon](projeler/otel-rezervasyon/) | Rezervasyon ve otel yönetimi | Next.js / Prisma / PostgreSQL |
| 6. [Kütahya Satılık Tarla](projeler/satilik-tarla/) | Arazi ilan platformu | Next.js / Prisma / PostGIS / Redis |
| 7. [Avukat Sitesi](projeler/avukat-sitesi/) | Hizmet, makale ve karar yönetimi | React / Express / MongoDB |
| 8. [Baha Fitness](projeler/fitness/) | Üyelik ve spor salonu yönetimi | Next.js / Prisma / PostgreSQL |
| 9. [GS Futbol Okulu](projeler/gs-futbol-okulu/) | Kayıt, aidat ve yoklama yönetimi | Next.js / Drizzle / SQLite |
| 10. [macOS Portfolyo](projeler/macos-portfolyo/) | Masaüstü benzeri portfolyo | Next.js / Zustand / MongoDB |
| 11. [Kişisel Portfolyo](projeler/kisisel-portfolyo/) | Proje vitrini ve blog | Next.js / MDX |
| 12. [ÜnKo Kozmetik](projeler/unko-kozmetik/) | E-ticaret ve yönetim paneli | React / Express / MongoDB |

## Çalışmaya başla

1. `projeler/` altından inceleyeceğiniz projenin klasörüne girin.
2. Varsa projenin kendi README dosyasını okuyun. Frontend ve backend ayrıysa kendi dizinlerinde kurulur.
3. İlgili projenin yerel ortam ayarlarını ve örnek veritabanını hazırlayın. `.env.example` bulunan projelerde bu dosya başlangıç şablonudur.
4. Yalnızca üzerinde çalışacağınız projenin bağımlılıklarını kurup onu başlatın.

Bu repo tek bir uygulama değildir; kök dizinde bütün projeleri başlatan ortak bir komut yoktur. Projelerin portları çakışabileceği için başlangıçta bir projeyi çalıştırın.

## Kopyaların durumu

- Proje klasörlerindeki tüm izlenen dosyalar, kaynak repoların belirtilen commitlerinden içerikleri değiştirilmeden alınmıştır. Mevcut README, görseller, örnek ayarlar ve varsa eski arşivler de korunmuştur.
- Kaynak repolar ve kaynak projelerin kodları değiştirilmemiştir.
- Kaynak repoların `.git` dizinleri ve eski commit geçmişleri bu arşive taşınmamıştır. Bu reponun kendi, bağımsız Git geçmişi vardır.
- Yerel makinedeki bağımlılıklar, kişisel `.env` dosyaları ve izlenmeyen dosyalar kopyalanmamıştır.
- Bu bir kaynak arşividir. Her projenin kurulum eksiklerinin giderildiği veya harici servislerinin eğitim için ayarlandığı anlamına gelmez. Mevcut kod canlı servislerle entegrasyon içerebilir; çalıştırırken ayrı yerel veritabanı ve eğitim ayarları kullanın.
- Projeye özel görevler, teslim ölçütleri ve ortak onboarding rehberi daha sonra ayrıca hazırlanacaktır.

## Kaynak ve sürüm kaydı

[KAYNAKLAR.json](KAYNAKLAR.json) her proje için kaynak repo adresini, dalı, commit kimliğini ve dosya ağacı kimliğini içerir. Bu kayıt hangi sürümlerin bir araya getirildiğini gösterir.

Bu arşiv ekip içi çalışma içindir. Müşteri kodları, markalar ve üçüncü taraf içeriklerinin kullanım hakları kaynak projelerden bağımsız olarak değerlendirilmelidir.
