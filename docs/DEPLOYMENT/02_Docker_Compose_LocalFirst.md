# 02 Local Runtime (No Docker Required)

## هدف
اجرای سرویس‌های local-first برای توسعه، بدون وابستگی اجباری به Docker.

## Primary Path (Recommended)
- PostgreSQL محلی (یا managed داخلی شبکه سازمان)
- اجرای API:
  - `DATABASE_URL=... pnpm api:dev`
- اجرای Web:
  - `pnpm dev`
- اجرای خودکار استک لوکال:
  - `DATABASE_URL=... pnpm -w local:stack:start`
  - `pnpm -w local:stack:status`
  - `pnpm -w local:stack:stop`
- اجرای reverse proxy روی host (اختیاری و بدون Docker):
  - پیش‌نیاز: نصب `nginx` روی سیستم
  - `pnpm -w local:proxy:start`
  - `pnpm -w local:proxy:status`
  - `pnpm -w local:proxy:stop`
  - پیش‌فرض: `http://127.0.0.1:8080`

## Optional Fallback
- `ops/compose.local.yml` فقط fallback است و مسیر اصلی پروژه محسوب نمی‌شود.
