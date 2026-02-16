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
- (اختیاری) `ADMIN_API_KEY` برای فعال شدن endpointهای ادمین

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

## Smoke (Mock Payment)
اگر دیتابیس در دسترس باشد:
- `pnpm -w smoke:mock-payment`

## Local‑First Gate
قبل از PR:
- `pnpm -w local-first:scan`
