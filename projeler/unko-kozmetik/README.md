# ÜnKo Kozmetik

Kozmetik e-ticaret sitesi: mağaza, sepet ve ödeme, kullanıcı hesabı ve admin paneli.

| Klasör | Teknoloji |
|---|---|
| `backend/` | Node.js, Express 4, MongoDB (Mongoose 7), JWT, Stripe |
| `frontend/` | React 18, Vite 6, React Router 7, Ant Design 5 |
| `docker-compose.yml` | Yerel MongoDB 7 |

## Gereksinimler

- Node.js 20 veya üstü
- Docker (yerel MongoDB için)

## Kurulum ve çalıştırma

```bash
# 1) Veritabanı
docker compose up -d                 # localhost:27017, veriler "unko-mongo-data" volume'unda

# 2) Backend  →  http://localhost:5001
cd backend
npm install
cp .env.example .env                 # SECRET_KEY ve REFRESH_SECRET'i doldurun (dosyada komut var)
npm run seed                         # admin, demo kullanıcı, kategoriler, 22 demo ürün, kupon
npm run dev

# 3) Frontend  →  http://localhost:5173  (ayrı terminalde)
cd frontend
npm install
cp .env.example .env
npm run dev
```

Backend 5001 portunu kullanıyor, çünkü macOS'ta 5000 portu AirPlay Receiver'a ayrılmış.

## Hazır hesaplar (`npm run seed`)

| Rol | E-posta | Şifre |
|---|---|---|
| Admin | admin@unkokozmetik.com | admin123 |
| Müşteri | kullanici@unkokozmetik.com | kullanici123 |

- Demo müşterinin kayıtlı bir adresi var, yani doğrudan ödeme adımına geçebilir.
- Hazır kupon kodu: `HOSGELDIN10` (%10 indirim).
- Admin bilgileri `.env` içindeki `SEED_ADMIN_EMAIL` ve `SEED_ADMIN_PASSWORD` ile değiştirilebilir.
- Seed var olan kayıtlara dokunmaz, tekrar çalıştırmak güvenlidir. Demo ürünler yalnızca veritabanında hiç ürün yoksa eklenir.
- Demo veri komutu `NODE_ENV=production` ortamında ve uzak veritabanlarında çalışmaz. `MONGO_URI`, `mongodb://` ile başlamalı; sunucu adı `localhost`, `127.0.0.1`, `[::1]` veya yerel Docker ağı içindeki `mongo` / `unko-mongo` olmalıdır. Docker Compose veritabanı portunu yalnızca `127.0.0.1` üzerinde açar.
- Demo ürünler gerçek ürün fotoğraflarıyla gelir. Markasız fotoğraflar için "ÜnKo Professional" adı kullanıldı. Bunlar örnek veridir; gerçek katalog admin panelinden girilmelidir.

## Ödeme

- **Test modu.** `STRIPE_SECRET_KEY` boşsa ve ortam production değilse ödeme test modunda çalışır. "Sepeti onayla" butonu gerçek tahsilat yapmadan siparişi tamamlar. Sepet sayfasında bunu belirten bir uyarı görünür.
- **Stripe.** `STRIPE_SECRET_KEY` doldurulunca ödeme Stripe Checkout'a yönlenir. Para birimi TRY'dir. Sipariş, başarı sayfasında Stripe'tan ödeme doğrulanınca "ödendi" olur.
- **Stripe webhook (opsiyonel).** Kullanıcı ödeme sonrası sayfayı kapatsa da siparişin onaylanması için `STRIPE_WEBHOOK_SECRET` tanımlayın. Endpoint: `POST /api/payment/webhook`, olay: `checkout.session.completed`.
- **Production'da Stripe anahtarı yoksa** ödeme kapalıdır ve API 503 döner.

Tutarlar her zaman sunucuda, veritabanındaki fiyatlardan hesaplanır. Ürün fiyatı, kupon ve kargo istemciden alınmaz. Kargo 200 ₺'dir; kupon sonrası tutar 1750 ₺ ve üzerindeyse kargo ücretsizdir.

## Komutlar

| Nerede | Komut | Açıklama |
|---|---|---|
| backend | `npm run dev` | Değişiklikte yeniden başlayan sunucu |
| backend | `npm start` | Production sunucusu |
| backend | `npm run seed` | Demo verisi |
| frontend | `npm run dev` | Geliştirme sunucusu |
| frontend | `npm run build` | Production build (`dist/`) |
| frontend | `npm run lint` | ESLint |

## Tasarım

- **Renkler ve fontlar:** Token'lar [frontend/src/index.css](frontend/src/index.css) içinde, `:root` altında tanımlı. Zemin sıcak fildişi, metin mürdüm tonlu koyu renk, tek vurgu rengi gül kurusu (`--accent`). Başlıklarda Fraunces, gövde metninde Geist kullanılıyor.
- **antd:** Hesabım sayfası, admin paneli ve onay pencereleri aynı paleti [frontend/src/main.jsx](frontend/src/main.jsx) içindeki tema üzerinden kullanır.
- **Görsel kaynakları:** Fotoğrafların hepsi ticari kullanıma izin veren Unsplash ve Pexels lisanslarıyla alındı. Kaynak listeleri: [backend/seed/images/CREDITS.md](backend/seed/images/CREDITS.md) ve [frontend/public/img/site/CREDITS.md](frontend/public/img/site/CREDITS.md).

## Notlar

- **Ürün görselleri** MongoDB'de saklanır ve `GET /api/products/:id/images/:imageId` adresinden önbelleklenebilir şekilde sunulur. Görsel başına sınır 2 MB, ürün başına en fazla 6 görsel. İzin verilen formatlar JPG, PNG, WEBP, GIF ve AVIF.
- **Üst menüdeki "Mağaza" açılır menüsü** kategorilerden otomatik oluşur. Kategorinin hangi başlık altında listeleneceği admin panelindeki **Menü Grubu** alanıyla belirlenir. Ana sayfadaki büyük kategori kutuları da bu gruplardan oluşur ve `/shop?group=<grup>` sayfasına gider.
- **Admin yetkisi** her istekte sunucuda kontrol edilir. Frontend'deki `isAdmin` bayrağı yalnızca arayüz içindir.
- **Bülten popup'ı** (`components/Modals/Dialog`) `Dialog.css` içinde `display: none` ile gizli. Form `POST /api/newsletter` endpoint'ine bağlıdır. Göstermek için o satırı kaldırmanız yeterli.
