# Kütahya Satılık Tarla

Kütahya ve ilçelerindeki arazi/tarla/arsa ilanları için üyelikli ilan platformu.
Üyeler ilan başvurusu yapar; admin inceleyip ekip çekiminden sonra yayına alır.
Ziyaretçiler ilanları filtreler, harita üzerinde bölge çizerek arar, üyeler ilan
sahibiyle platform içinden mesajlaşır.

## Teknoloji Yığını

- **Next.js** (App Router, TypeScript) — `src/app`
- **PostgreSQL + PostGIS** (Prisma ORM) — şema: `prisma/schema.prisma`
- **Redis + BullMQ** — e-posta, medya işleme ve günlük özet kuyrukları
- **Worker** (`src/worker`) — sharp ile görsel varyantları, nodemailer ile posta,
  kayıtlı arama özetleri
- **better-auth** — üye/admin oturumları, e-posta doğrulama zorunlu
- **Docker Compose** — dev altyapısı `docker-compose.dev.yml`, prod `docker-compose.yml`

## Geliştirme Ortamı

Gereksinimler: Node 22+, Docker.

```bash
npm install
# 1) Kök dizine .env oluştur (aşağıdaki tablo)
# 2) Altyapıyı kaldır (Postgres :5433, Redis :6380, Mailpit :1026/:8026)
npm run docker:dev:up
# 3) Şema + tohum veri
npm run db:migrate
npm run db:seed
# 4) İki terminalde:
npm run dev      # Next.js — http://localhost:3000
npm run worker   # kuyruk işleyici (e-posta/medya/özet)
```

Mailpit arayüzü: <http://localhost:8026> — gönderilen tüm e-postalar burada birikir.

### Ortam Değişkenleri (.env)

Repo hiçbir `.env` varyantı içermez (bilinçli karar); dosyayı elle oluşturun.

| Değişken | Açıklama |
|---|---|
| `DATABASE_URL` | Postgres bağlantısı — dev: `postgresql://kst_dev:<şifre>@localhost:5433/kutahyasatiliktarla_dev` |
| `REDIS_URL` | Redis — dev: `redis://localhost:6380` |
| `BETTER_AUTH_SECRET` | Oturum imza sırrı (uzun rastgele değer) |
| `BETTER_AUTH_URL` | Sunucu tarafı taban URL — dev: `http://localhost:3000` |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | Client tarafı taban URL (build argümanı olarak da geçer) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_SECURE` / `SMTP_FROM` | Posta — dev: Mailpit (`localhost` / `1026` / boş kullanıcı) |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | `db:seed` sırasında oluşturulan admin hesabı |
| `ADMIN_EMAIL` | Lead/şikayet bildirimlerinin gideceği adres |
| `DEV_DB_USER` / `DEV_DB_PASSWORD` / `DEV_DB_NAME` | `docker-compose.dev.yml` Postgres değerleri |
| `DEMO_TESTER_PASSWORD` | (Opsiyonel) `prisma/demo-data.ts` test üyelerinin şifresi |
| `UPLOAD_DIR` | (Opsiyonel) Medya kök dizini — varsayılan `./uploads`, compose içinde ayarlanır |
| `STANDALONE` | (Yalnız Docker build) `1` → Next standalone çıktı |

## Komutlar

| Komut | İş |
|---|---|
| `npm run dev` / `npm run build` / `npm start` | Next.js |
| `npm run worker` | Kuyruk işleyici (tsx watch) |
| `npm run lint` / `npm run lint:fix` | ESLint |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` |
| `npm test` / `npm run test:watch` | Vitest (birim testleri `src/**/*.test.ts`) |
| `npm run format` / `npm run format:check` | Prettier (src) |
| `npm run db:migrate` / `db:seed` / `db:studio` | Prisma |
| `npm run docker:dev:up` / `down` / `logs` | Dev altyapı |

CI (GitHub Actions, `.github/workflows/ci.yml`) her push/PR'da lint + tip
kontrolü + testleri koşar.

## Mimari Notlar

- **Medya akışı:** admin panelden yüklenen orijinal → worker sharp/ffmpeg ile
  varyant üretir → orijinal silinir → `/m/{listingId}/…` altından servis
  (`src/app/m/[...path]`). Üye yalnızca şikayet ekran görüntüsü yükler; bu uç
  sharp ile yeniden kodlayıp EXIF/GPS temizler.
- **Arama:** URL paramları → Prisma `where` dönüşümü tek yerde:
  `src/lib/search-core.ts` (hem `/ilanlar` hem worker'daki günlük özet kullanır).
- **Yetki:** `src/proxy.ts` yalnızca cookie varlığına bakar (iyimser); otoriter
  rol/ban kontrolü `admin/layout.tsx` ve `hesap/layout.tsx` katmanlarında.
- **Prod:** `docker-compose.yml` (app + worker + postgres + redis + mailpit),
  önünde VPS'te Nginx; ayrıntılı ürün kararları için `PDD.md` (repo dışı tutulur).
