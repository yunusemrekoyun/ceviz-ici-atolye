# Canlıya Çıkış (Production) Kontrol Listesi

Sunucu açılışında `instrumentation.ts` → `assertEnv()` zorunlu değişkenleri
doğrular; eksikse **production'da başlatmayı durdurur**. Aşağıdaki liste
referanstır.

## 1. Zorunlu ortam değişkenleri (eksikse uygulama çalışmaz)

| Değişken | Açıklama |
|---|---|
| `DATABASE_URL` | Postgres bağlantısı (Supabase pooler, 6543). |
| `DIRECT_URL` | Migration/doğrudan bağlantı (5432). |
| `JWT_ACCESS_SECRET` | Oturum imzalama, **≥32 karakter**. `openssl rand -hex 32`. |
| `PII_ENCRYPTION_KEY` | TC/pasaport at-rest şifreleme. `openssl rand -hex 32`. **DB paylaşan tüm ortamlarda AYNI** (lokal + VPS), yoksa kayıtlı veriler çözülemez ve kimlik içeren her yazma hata verir. |
| `CHECKIN_DOCUMENT_ENCRYPTION_KEY` | Check-in kimlik belgesi şifreleme, **32 byte base64**. `openssl rand -base64 32`. |

## 2. Önerilen / özelliğe bağlı

| Değişken | Ne zaman |
|---|---|
| `APP_URL` | E-posta linkleri + ödeme callback dönüş adresi. |
| `IYZICO_ENABLED`, `IYZICO_API_KEY`, `IYZICO_SECRET_KEY`, `IYZICO_BASE_URL`, `IYZICO_CALLBACK_BASE_URL` | Online ödeme için (canlı anahtarlar). |
| `KBS_SECRET_KEY` | KBS kullanılacaksa zorunlu; **DB paylaşan ortamlarda AYNI**. |
| `GOOGLE_PLACES_API_KEY`, `GOOGLE_PLACE_ID` | Google yorumları (opsiyonel). |
| `PRIVATE_UPLOAD_ROOT` | Şifreli check-in belgelerinin kök dizini (varsayılan `.private/uploads`). |

## 3. Go-live adımları

1. Yukarıdaki zorunlu değişkenleri üretim `.env`'ine gir. Anahtarları **bir kez** üret ve güvenli sakla.
2. Şema: `npm run db:migrate:deploy` *veya* (drift varsa) `npx prisma db push`.
3. **PII backfill** — mevcut düz-metin TC/pasaportları şifrele (bir kez, idempotent):
   ```
   npx tsx prisma/encrypt-pii.ts
   ```
4. Build & başlat: `npm run build && npm run start`.
5. Statik çıkış IP'sini KBS portalına kaydet (KBS kullanılacaksa) ve admin panelden "Bağlantıyı Test Et".
6. iyzico **canlı** tek işlem testi + KBS canlı tek misafir testi.
7. Reverse proxy'de HTTPS + `X-Forwarded-For` ilet (rate limiter ve oturum IP'si bunu kullanır). nginx varsayılan `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;` yeterli — limiter **en sağdaki** (proxy'nin eklediği gerçek) IP'yi kullanır, böylece istemci sahte XFF göndererek limiti aşamaz. **Tek proxy** varsayımı; öne CDN (Cloudflare) konursa limiter onun client-IP başlığına göre güncellenmeli.

## 4. Güvenlik notları

- Tek VPS varsayımıyla rate limiter bellek-içidir ([src/lib/rate-limit.ts](src/lib/rate-limit.ts)). Birden çok instance'a ölçeklenirse paylaşımlı store (Redis) gerekir.
- Tam `script-src` CSP launch sonrası test fazına bırakıldı (ödeme/inline script'leri bozmamak için). Şu an `frame-ancestors`, HSTS, nosniff, Referrer-Policy aktif ([next.config.ts](next.config.ts)).
