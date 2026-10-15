# Kütahya Galatasaray Futbol Okulları

Registration and management system for the Galatasaray Spor Okulları football school in Kütahya. Live at [kutahyagsfutbolokulu.com](https://kutahyagsfutbolokulu.com).

## What's in it

| Route | Who | What |
| --- | --- | --- |
| `/` | public | Homepage: one fixed frame with sections (school, program, coaches, registration, contact) moved by scroll or swipe, birth-year group finder with live groups and schedules, callback form, school phone from Settings. Coach profiles come from the panel (Hoca Tanıtımları). Implemented in `components/home`. |
| `/on-kayit` | parents | Public registration form (the QR points here). |
| `/admin` | staff | Panel: today view, fees, cashbook (money taken day by day, cash and bank transfer apart), students (ready-made lists such as "fee not paid" or "rarely attends"), kit, attendance, reports, applicants and appointments, program, groups and program (today's and tomorrow's trainings, age ranges, weekly calendar, each group's students, days, coach and upcoming sessions; PDF and Excel outputs: group lists with any student or payment field, attendance sheets, weekly program), development, cards, announcements, parent accounts, team and roles, settings. Login at `/admin/giris`. |
| `/antrenor` | coaches | Sessions, attendance by QR card or list, development entries. |
| `/veli` | parents | Child's card, calendar, attendance, development, fee status with "I paid" upload, announcements, consents. |
| `/giris` | coaches, parents | Login for the coach and parent areas. |
| `/k/[code]` | anyone | Student card QR landing; what it shows depends on who scans it. |

Fees work as training rights: one fee buys the group's next 8 sessions. A session uses up a right whether or not the student attends; cancelled sessions don't. Staff see the next payment date, not a counter, and plain payment statuses: paid, payment coming up, first fee expected, payment day reached, promised, late. The attendance and coach screens keep the training-right wording (can train / cannot train). A parent's promised payment day keeps the student training until that day. Students can be marked as goalkeepers; they are flagged in lists, attendance and the coach area, and counted apart in kit orders. Every payment (fee receipts and kit) is recorded with its day, method and the staff member who took it; a wrongly entered method, day or note can be corrected without voiding the receipt. The kit set (shirt, shorts, socks) has two sizes picked from buttons, a shirt size ("9-10", "M") and a socks size ("34-36"), and the socks are handed out and tracked apart from the shirt. The kit page counts orders by size (goalkeepers apart) and prints the order list as PDF or Excel.

The panel is built for non-technical staff who mostly use a phone: plain-language headings, big numbers, one tap to the related list, and call / ready-made WhatsApp buttons on people lists. Reports answer everyday questions (money in this month, fees still expected, renewals this week, students who rarely attend) instead of showing tables.

## Stack

Next.js 16 (App Router, TypeScript), React 19, Tailwind CSS 4, SQLite (better-sqlite3, WAL) with Drizzle ORM, zod, exceljs, pdfmake, qrcode, jsqr, lucide-react, nodemailer, sharp.

## Development

```bash
npm install
# create .env (see below)
npm run db:migrate
npm run admin:seed
npm run dev -- -p 3177
```

Migrations also run automatically when the app opens the database.

## Environment (`.env`)

| Key | Purpose |
| --- | --- |
| `PORT` | Port the app binds to on `127.0.0.1` (production: 3050) |
| `DATABASE_PATH` | SQLite file, e.g. `./data/registrations.db` |
| `NEXT_PUBLIC_SITE_URL` | Public base URL used in QR codes and links; set before building |
| `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MINUTES` | Per-IP limit for the public form |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Used by `npm run admin:seed` |
| `CRON_SECRET` | Bearer token for `POST /api/cron/daily` (16+ characters) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Optional; without them no mail is sent |

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` / `build` / `start` | Dev server, production build, production start |
| `npm run typecheck` / `lint` | tsc / eslint |
| `npm run smoke` | Logic tests against a temporary database |
| `npm run db:migrate` / `db:generate` | Apply migrations / generate one after a schema change |
| `npm run db:backup -- [dir]` | Consistent SQLite backup plus uploaded files (default `data/backups/`) |
| `npm run admin:seed` | Create the admin from `.env`, or reset its password |
| `npm run import:enrollments -- <xlsx> [--apply]` | Apply a field enrollment spreadsheet (dry run without `--apply`) |
| `npm run import:list -- <json> [--apply]` | Import a hand-kept list |
| `npm run reset:payments [-- --apply]` | Remove all payment and kit data (dry run without `--apply`); restart the app afterwards |
| `npm run kit:sizes [-- --apply]` | Split kit sizes typed into one field ("9-10 Yaş 34-36") into shirt size and socks size (dry run without `--apply`) |
| `npm run db:seed-demo` | Demo data for an empty local database |

## Layout

- `app/` – routes: `admin/(panel)`, `antrenor`, `veli`, `on-kayit`, API routes under `api/`
- `components/` – shared UI: `admin/` (panel kit, menu, search, notes, confirm, section tabs, dependency-free charts), `staff/` (attendance, QR scanner), `guardian/`, `Modal`, `Calendar`, `ui`
- `lib/` – domain logic: `registrations`, `billing` + `billing-shared` + `training-rights` (fees), `cashbook` + `cashbook-shared` (day-by-day money), `equipment` + `equipment-shared` (kit, sizes, size board), `program` + `attendance` (sessions), `insights` + `reports` (report figures and Excel), `pdf` + `program-sheets` + `export/extras` (PDF and Excel outputs), `development`, `cards` + `scan`, `jobs` (daily job), `auth/`, `validation` (server) + `registration-fields` (client-safe), `db/schema`
- `drizzle/` – SQL migrations
- `scripts/` – CLI tasks listed above

## Production

Build with `npm run build`, run with `pm2 start ecosystem.config.cjs`. The app binds to `127.0.0.1:$PORT`; nginx terminates HTTPS in front of it. A cron job calls `POST /api/cron/daily` hourly with `Authorization: Bearer $CRON_SECRET` (the job runs once per day), and another takes backups with `npm run db:backup`. `GET /api/saglik` reports database and daily-job health.

Before committing: `npm run typecheck && npm run lint && npm run smoke`.
