# Baha Fitness — Premium Fitness Management Platform

Production-ready Next.js 15 + Prisma + PostgreSQL üzerine kurulu, ultra modern dark/neon estetiğe sahip premium fitness yönetim platformu.

## ⚡ Hızlı Başlangıç

```bash
# 1) Bağımlılıkları yükle
npm install

# 2) Ortam değişkenlerini ayarla
cp .env.example .env
# .env içinde DATABASE_URL ve JWT_SECRET değerlerini düzenle

# 3) Veritabanını hazırla
npm run db:push      # şema değişikliklerini DB'ye uygula
npm run db:seed      # demo veri (admin, üye, planlar, eğitmen)

# 4) Geliştirme sunucusunu başlat
npm run dev
```

Tarayıcıdan **http://localhost:3000** açılır.

## 👤 Demo Hesaplar

| Rol      | E-posta                    | Şifre        |
| -------- | -------------------------- | ------------ |
| Admin    | admin@bahafitness.com      | admin123     |
| Eğitmen  | elif@bahafitness.com       | trainer123   |
| Üye      | uye@bahafitness.com        | member123    |

- Admin paneli: **/admin**
- Üye paneli:   **/panel**
- Anasayfa:     **/**

## 🧱 Mimari

```
src/
├── app/
│   ├── (auth)/            # giriş & kayıt sayfaları (split layout)
│   ├── admin/             # tam admin paneli (sidebar + topbar)
│   │   ├── uyeler/        # üye listesi & detay
│   │   ├── odemeler/      # ödeme & faturalar
│   │   ├── egitmenler/    # eğitmen kartları
│   │   ├── randevular/    # randevu tablosu
│   │   ├── subeler/       # şube yönetimi
│   │   ├── raporlar/      # finansal raporlar + grafikler
│   │   ├── icerik/        # site içeriği / CMS
│   │   ├── bildirimler/   # email/sms/push gönderim
│   │   ├── ai-asistan/    # AI placeholder
│   │   └── ayarlar/       # sistem ayarları
│   ├── panel/             # üye paneli (üyelik kartı, QR, ödemeler)
│   ├── api/
│   │   ├── auth/          # login, register, logout, me
│   │   ├── members/       # CRUD
│   │   ├── payments/      # CRUD
│   │   └── stats/         # dashboard metrikleri
│   ├── globals.css        # Tailwind + custom utilities
│   ├── layout.tsx
│   └── page.tsx           # premium landing page
├── components/
│   ├── landing/           # Hero, Features, Pricing, Trainers, BMI, FAQ, CTA, Footer, Navbar
│   └── admin/             # Sidebar, Topbar, StatCard, RevenueChart, PageHeader
├── lib/
│   ├── prisma.ts          # singleton PrismaClient
│   ├── jwt.ts             # jose ile sign/verify
│   ├── auth.ts            # cookie session, requireUser, requireAdmin
│   ├── password.ts        # bcrypt
│   ├── validators.ts      # zod şemaları
│   └── utils.ts           # cn, formatTRY, formatDate, vs.
├── middleware.ts          # /admin ve /panel için role-based guard
└── ...

prisma/
├── schema.prisma          # 16+ model: User, Member, Membership, Plan,
│                          # Payment, Trainer, Appointment, Branch,
│                          # SiteSetting, BlogPost, MediaAsset, Testimonial,
│                          # Notification, AuditLog, Session, Attendance, Measurement
└── seed.ts                # demo veri
```

## ✨ Şu An Çalışan Özellikler

### Public Site
- Cinematic hero + glassmorphism istatistik kartları
- Premium üyelik tablosu (3 plan, popüler vurgu, animasyonlu)
- Eğitmen kartları (hover animasyon)
- Canlı BMI hesaplayıcı (slider + renkli gradient bar)
- Müşteri yorumları, FAQ accordion, CTA, footer
- Tam responsive, sticky navbar (scroll detect), mobil drawer

### Auth
- E-posta/şifre ile kayıt + giriş (JWT cookie, httpOnly)
- Rol tabanlı erişim (ADMIN, STAFF, TRAINER, MEMBER)
- Middleware ile /admin ve /panel koruması
- Otomatik üye numarası (BF-000001) ve QR kod üretimi

### Admin Paneli
- **Dashboard:** 4 istatistik kartı, 12 aylık gelir grafiği (recharts area), son üyeler & ödemeler
- **Üyeler:** Tablo, durum çipleri, arama, detay sayfası (profil, plan, ödemeler, check-in, ölçümler)
- **Ödemeler:** Tablo + 3 metrik, durum badge
- **Eğitmenler:** Kart görünümü, üye/randevu/komisyon
- **Randevular, Şubeler, Raporlar, İçerik (CMS), Bildirimler, AI, Ayarlar:** Tam tasarımlı sayfalar
- **Sidebar:** Gruplu navigasyon (Genel / Operasyon / İçerik / Sistem) + premium upgrade kartı
- **Topbar:** Arama, bildirim, kullanıcı menüsü + çıkış

### Üye Paneli
- Premium üyelik kartı (QR placeholder, kalan gün)
- Hızlı istatistikler (haftalık check-in, toplam ödeme, son kilo)
- Ödeme geçmişi & check-in geçmişi

## 🎨 Tasarım Sistemi

- **Renkler:** `ink-950` (#06070A) ana, `neon` (#C6FF3D) accent, cyan/violet/amber ikincil
- **Glass:** `.glass`, `.glass-strong` utility'leri
- **Gradient text:** `.text-gradient-neon` (neon → cyan → violet)
- **Buttons:** `.btn-primary`, `.btn-secondary`, `.btn-outline`, `.btn-ghost` × 3 boyut
- **Inputs:** `.input-base` (focus ring neon)
- **Badges:** success / warn / danger / info / neon / neutral
- **Cards:** `.card-surface` (subtle inset shadow + border)
- **Animasyonlar:** Framer Motion (fade-in/slide), Tailwind keyframes (shimmer/float/pulse-glow)

## 🔌 Stub Entegrasyonlar

`.env.example` içinde aşağıdakiler için yer ayrılmış, **henüz bağlanmamış**:

- **Stripe** — ödeme & abonelik
- **iyzico** — Türkiye yerel ödeme
- **Cloudinary** — medya yükleme (admin/icerik)
- **Resend** — transactional mail
- **Twilio** — SMS
- **OpenAI** — AI antrenman/beslenme önerileri (admin/ai-asistan)

Anahtarları `.env`'e ekleyince bu modüller aktive edilebilir.

## 🚀 Deploy

### Vercel
```bash
vercel
# DATABASE_URL ve JWT_SECRET environment variable'ları ekle
# Build command: prisma generate && next build
```

PostgreSQL için: **Neon**, **Supabase**, **Railway**, **Vercel Postgres** önerilir.

### Build & Lint
```bash
npm run build
npm run lint
npm run db:studio    # Prisma Studio
```

## 📋 Sıradaki Adımlar (Önerilen)

Bu temel üzerine ekleyebileceklerimiz:
1. **Stripe / iyzico** gerçek entegrasyon (webhook + abonelik)
2. **Cloudinary** medya yükleyici (admin/icerik içinde)
3. **QR girişi**: gerçek QR generator + kapı okuyucu API endpoint
4. **Üye CRUD** modal/form'ları (şu an liste/detay var)
5. **PWA + push notifications**
6. **Multi-branch + staff izinleri**
7. **AI asistan** (OpenAI) — antrenman programı üretimi
8. **Blog detay sayfası + admin editör**
9. **Email verification + forgot password** akışı

## 📝 Notlar

- **PowerShell:** Windows'taysanız `npm install` yeterli; sadece `npm run db:push` öncesi PostgreSQL hazır olmalı.
- **Lokal DB:** PostgreSQL kurulu değilse Docker ile: `docker run -d --name pg -e POSTGRES_PASSWORD=pass -p 5432:5432 postgres:16` ve DATABASE_URL'i `postgresql://postgres:pass@localhost:5432/baha_fitness`.
- Tüm metinler **Türkçe**'dir.

---

Baha Fitness — Premium Fitness Management Platform
