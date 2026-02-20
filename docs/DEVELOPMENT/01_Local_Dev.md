# 01 Local Dev

## Requirements
- Node.js 20+
- `pnpm`
- PostgreSQL

## Install
- `pnpm install`

## API (Fastify + Postgres)
1) تنظیم env:
- `DATABASE_URL` (اجباری)
- `PUBLIC_BASE_URL` (پیشنهادی، پیش‌فرض `http://127.0.0.1:4000`)
- `PAYMENT_GATEWAY=mock` (برای تست لوکال)
- `PAYMENT_GATEWAY=idpay` (اختیاری، برای تست callback با امضا)
- `PAYMENT_GATEWAY_WEBHOOK_SECRET` (برای gateway غیر mock)
- `PAYMENT_GATEWAY_TIMEOUT_MS` (پیش‌فرض 5000)
- Admin endpointها با session token + role کنترل می‌شوند (`platform_admin`/`support_admin`/`auditor`)

نمونه‌ها در:
- `.env.example`
- `apps/api/.env.example`

2) اجرا:
- `pnpm api:dev`

Endpoints کلیدی:
- `POST /api/v1/auth/signup` → `{ user, session.token }`
- `POST /api/v1/creators`
- `POST /api/v1/creators/:creatorId/plans`
- `POST /api/v1/subscriptions/checkout`
- `GET  /api/v1/payments/:gateway/callback` (برای mock از طریق redirect)
- `GET  /api/v1/subscriptions/me`

## Web (Next.js)
- `pnpm dev`

## Local Stack Scripts (No Docker)
- start:
  - `DATABASE_URL=... pnpm -w local:stack:start`
- status:
  - `pnpm -w local:stack:status`
- stop:
  - `pnpm -w local:stack:stop`
- Optional reverse proxy on host (nginx local install):
  - `pnpm -w local:proxy:start`
  - `pnpm -w local:proxy:status`
  - `pnpm -w local:proxy:stop`
  - پیش‌فرض روی `http://127.0.0.1:8080` سرو می‌شود و `/api` به API لوکال route می‌شود.
- صفحات عمومی:
  - `/creators`
  - `/creators/:slug`

## Seed Demo Data (Local)
- برای پر کردن لیست creatorها و اجرای یک checkout/callback واقعی mock:
  - `pnpm -w seed:local-demo`
- پیش‌فرض از proxy لوکال استفاده می‌کند:
  - `BASE_URL=http://127.0.0.1:8080 pnpm -w seed:local-demo`

## Full Local Automation (0->100 Runtime)
- اجرای خودکار کامل: Postgres لوکال + API/Web + Proxy + Seed + Evidence + Sync
  - `pnpm -w run:local:full`

## DB Backup/Restore (Production Prep)
- Backup:
  - `DATABASE_URL=... pnpm -w db:backup`
- Restore (latest backup by default):
  - `DATABASE_URL=... pnpm -w db:restore`
- Restore specific file:
  - `DATABASE_URL=... BACKUP_FILE=/path/to/db-backup-*.dump pnpm -w db:restore`

## Smoke (Mock Payment)
اگر دیتابیس در دسترس باشد:
- `pnpm -w smoke:mock-payment`

## Smoke (IDPay-style Callback)
برای تست callback با امضا:
- `export PAYMENT_GATEWAY_WEBHOOK_SECRET=change-me`
- `pnpm -w smoke:idpay-callback`

## Smoke (RBAC Admin)
برای تست RBAC روی مسیرهای ادمین:
- `pnpm -w smoke:rbac-admin`

## Smoke (Content Download Protection)
برای تست tokenized download با membership:
- `pnpm -w smoke:content-download`

## Smoke (All)
اجرای همه smokeها با PostgreSQL موقت:
- `pnpm -w smoke:all`

## Local‑First Gate
قبل از PR:
- `pnpm -w local-first:scan`
