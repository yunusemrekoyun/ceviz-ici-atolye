# Kütahya Garden Otel — Next.js Fullstack App

Kütahya Garden Otel is a Next.js App Router project with Supabase Postgres, Prisma, DB-backed refresh sessions, argon2id password hashing, and role-protected panels.

## Local Development

**Prerequisite:** Node.js 20+ recommended.

```bash
npm install
npm run dev
```

The development server runs on:

```text
http://localhost:3000
```

## Production Build

```bash
npm run build
npm run start
```

The start script binds to `0.0.0.0` and uses `PORT` when provided:

```bash
PORT=3000 npm run start
```

## VPS Notes

This project uses `output: 'standalone'` in `next.config.ts`, so a production build also creates a standalone server bundle under `.next/standalone`.

Fill the local `.env` file with your Supabase Postgres URI values and a strong `JWT_ACCESS_SECRET`.

Mail is sent through the global SMTP service in `src/lib/mail`. For Gmail, create a Google app password and fill these `.env` fields:

```text
MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_SECURE=true
MAIL_USER=yourgmail@gmail.com
MAIL_APP_PASSWORD=your-google-app-password
MAIL_FROM_EMAIL=yourgmail@gmail.com
MAIL_FROM_NAME=Kütahya Garden Otel
MAIL_REPLY_TO=optional-reply-address@example.com
```

Admin-only test endpoint:

```text
POST /api/mail/test
```

Useful deployment flow without Docker:

```bash
npm ci
npm run db:migrate:deploy
npm run db:seed:reset
npm run build
PORT=3000 npm run start
```

Docker deployment flow:

```bash
docker compose up -d --build
```

API routes:

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/reservations`
- `POST /api/contact`
- `POST /api/experiences`

Database commands:

```bash
npm run db:generate
npm run db:migrate:dev
npm run db:migrate:deploy
npm run db:seed:reset
```

Seed users:

```text
admin@gmail.com / yunus123
personel@gmail.com / yunus123
muhasebe@gmail.com / yunus123
musteri@gmail.com / yunus123
temizlikci@gmail.com / yunus123
```
