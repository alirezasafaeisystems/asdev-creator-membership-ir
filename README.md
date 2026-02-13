# asdev-creator-membership-ir — ریشه پروژه (Local-first)

این ریپو ریشه اجرایی و مرجع مستندات فنی Patreon-lite ایران است.
هدف: ساخت پلتفرم عضویت پولی برای Creatorها با پرداخت ریالی، امنیت عملیاتی، و runtime کاملا Local-first.

## اصول کلیدی
- Local-first runtime: بدون CDN یا سرویس خارجی در زمان اجرا
- معماری Modular Monolith با مرزبندی دامنه
- Audit-by-default برای auth/payment/payout/download
- تحویل مرحله ای: `P0 -> P1 -> P2 -> P3 -> RELEASE`

## شروع سریع
1. بررسی محیط:
```bash
node -v
pnpm -v
```

2. اعتبارسنجی مستندات:
```bash
pnpm -w docs:validate
```

3. اجرای گیت های کیفیت:
```bash
pnpm -w lint
pnpm -w typecheck
pnpm -w test:unit
pnpm -w test:integration
pnpm -w test:e2e
pnpm -w security:scan
```

4. اجرای فاز (روی برنچ اختصاصی):
```bash
pnpm -w phase:run P0
```

## ساختار
- `apps/` اپلیکیشن ها (API / Web)
- `modules/` مرزهای دامنه
- `docs/` اسناد رسمی پروژه
- `tools/` ابزارهای quality و phase automation
- `ops/` docker/nginx/scripts/dashboards
- `tasks/` قالب تسک های فاز

## نکته عملیاتی
`tools/phase-runner/run.sh` در صورت موفقیت snapshot ایجاد می کند و commit/tag می زند.
Push به remote فقط وقتی انجام می شود که runner را با `PHASE_RUNNER_PUSH=1` اجرا کنید.

نسخه: 2026-02-13
