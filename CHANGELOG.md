# تغییرات (Changelog)
نسخه: 1.1
تاریخ: 2026-02-13

## v1.1 — 2026-02-13
- هم ترازی کامل اسناد حاکمیت، سیاست، توسعه، معماری، دیپلوی و runbookها با ساختار واقعی ریپو
- حذف placeholderهای بحرانی از docs/modules/apps و تبدیل آن ها به قرارداد اجرایی
- افزودن داشبوردهای لوکال:
  - `ops/dashboards/development-dashboard.html`
  - `ops/dashboards/deploy-dashboard.html`
- بهبود عملیاتی:
  - پیاده سازی `ops/scripts/backup_db.sh` با `pg_dump`
  - پیاده سازی `ops/scripts/restore_db.sh` با `pg_restore`
  - بهبود `ops/nginx/nginx.local.conf` با endpointهای `/` و `/health` و پاسخ کنترل شده برای `/api/`
- سخت گیری کیفیت:
  - ارتقا `tools/docs-validator/validate.js` (بررسی فایل های مرجع و لینک های `docs/INDEX.md`)
  - ارتقا `tools/quality-typecheck.js` و `tools/quality-unit.js`
  - ارتقا `tools/security/validate-sensitive-policies.js`
- ایمن سازی phase runner:
  - push پیش فرض غیرفعال شد
  - push فقط با `PHASE_RUNNER_PUSH=1`
  - script جدید: `pnpm -w phase:run:push`
- هم ترازی CI و مالکیت کد:
  - به روزرسانی `.github/workflows/ci.yml`
  - به روزرسانی `.github/workflows/js-ts-level1.yml`
  - به روزرسانی `.github/CODEOWNERS`

## v1.0 — 2026-02-08
- ایجاد ریپوی مستندات فنی (clean)
- INDEX و STYLE_GUIDE
- PRD / API_DB_Deployment / Engineering_Playbook
- ابزارهای enforce (docs-validator / phase-runner)
