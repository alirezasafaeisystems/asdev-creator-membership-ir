# 00 System Overview

## Runtime Components (Current)
- `apps/web`: UI (Next.js) با فونت self-hosted
- `apps/api`: REST API (Fastify) + PostgreSQL

## Local‑First Rules
- هیچ CDN/runtime خارجی مجاز نیست (font/script/link external).
- فونت‌ها self-hosted در `apps/web/public/fonts`.
- Gate اسکن: `pnpm -w local-first:scan`

## Data Stores
- PostgreSQL: کاربران، creators/plans، subscriptions، payments، audit_events

## Payments (MVP)
- Adapter فعلی: `mock`
- چرخه: `checkout` → redirect به mock gateway → callback → idempotent update پرداخت/اشتراک + audit
