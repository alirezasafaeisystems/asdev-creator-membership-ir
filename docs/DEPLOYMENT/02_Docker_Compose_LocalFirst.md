# 02 Docker Compose LocalFirst

## هدف
اجرای سرویس‌های local-first برای توسعه (حداقل PostgreSQL + MinIO + Nginx).

## Compose File
- `ops/compose.local.yml`

## Note
در بعضی محیط‌ها ممکن است Docker نصب نباشد؛ در این حالت:
- PostgreSQL را بیرون از Docker اجرا کنید و `DATABASE_URL` را ست کنید
- API با `pnpm api:dev` و Web با `pnpm dev` بالا می‌آید
