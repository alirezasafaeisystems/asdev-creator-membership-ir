# ROADMAP_PHASED (No Timeline)

این نقشه راه عمدا زمان‌بندی تقویمی ندارد. حرکت پروژه فقط با «خروجی قابل تحویل + معیار پذیرش» انجام می‌شود.

## Operating Rules
- هر فاز فقط وقتی بسته می‌شود که معیارهای پذیرش همان فاز پاس شوند.
- اگر فازی blocker داشت، خروجی ناقص به فاز بعدی منتقل نمی‌شود.
- ترتیب فازها قابل تغییر محدود است، اما معیار پذیرش قابل حذف نیست.

## Phase 0 - Foundation Reliability
هدف: پایدارسازی خط تحویل و قواعد مهندسی
- Scope:
  - Docs validation, lint, typecheck, local-first scan, unit/build
  - Test strategy and DoD alignment
  - Baseline automation (`phase-runner`, quality scripts)
- Exit Criteria:
  - همه گیت‌های پایه سبز
  - هیچ TODO بحرانی در مسیرهای عملیاتی
  - مستندات اجرا و کیفیت همگام

## Phase 1 - Membership Core Hardening
هدف: هسته پرداخت/اشتراک قابل اتکا
- Scope:
  - Checkout idempotency hardening
  - `subscriptions/cancel`
  - `payments/:id` برای صاحب پرداخت
  - `health/db`
  - callback safety tests
- Exit Criteria:
  - سناریوهای failure/success/pending پوشش‌دار
  - duplicate callback باعث فعال‌سازی دوباره نشود
  - smoke + integration برای سناریوهای بحرانی پاس

## Phase 2 - Payment Provider Real Adapter
هدف: عبور از mock به درگاه واقعی
- Scope:
  - Adapter واقعی (مثلا Zarinpal/IDPay)
  - Webhook/callback signature verification
  - provider timeout/error mapping
  - reconciliation قابل اتکا با گزارش
- Exit Criteria:
  - خطاهای استاندارد پرداخت enforce شده
  - مسیر callback امن و idempotent
  - گزارش reconcile قابل استناد

## Phase 3 - Security and RBAC
هدف: کنترل دسترسی واقعی و کاهش ریسک عملیاتی
- Scope:
  - حذف `x-admin-key` و جایگزینی RBAC سشن‌محور
  - نقش‌ها: `platform_admin`, `support_admin`, `auditor`
  - سخت‌سازی rate-limit مسیرهای auth/payment callback
  - CORS و `PUBLIC_BASE_URL` policy
- Exit Criteria:
  - ماتریس RBAC در API enforce شده
  - تست مجوز مسیرهای ادمین پاس
  - لاگ audit برای رخدادهای حساس کامل

## Phase 4 - Content Protection and Delivery
هدف: تحویل امن محتوا فقط برای کاربر مجاز
- Scope:
  - storage design (disk/minio) + tokenized download
  - `GET /api/v1/download/:token`
  - access policy based on active membership
- Exit Criteria:
  - لینک مستقیم storage عمومی نباشد
  - توکن دانلود short-lived و قابل revoke باشد
  - runbook خطاهای دانلود کامل

## Phase 5 - Discovery and Public Experience
هدف: کشف‌پذیری محصول و ورودی ارگانیک
- Scope:
  - public creator pages (SSR/SSG)
  - creators/plans search/filter
  - metadata/sitemap baseline
- Exit Criteria:
  - مسیرهای عمومی indexable
  - queryهای اصلی search/filter پایدار
  - خط‌مشی SEO پایه در مستندات و اجرا همگام

## Phase 6 - Operations and Release Readiness
هدف: آماده‌سازی تحویل و نگه‌داری عملیاتی
- Scope:
  - local runtime scripts for web/api (no Docker dependency)
  - observability baseline and runbooks
  - release verification and rollback checklist
- Exit Criteria:
  - استقرار محلی کامل با اجرای مستقیم سرویس‌ها (api/web)
  - health checks عملیاتی و قابل مانیتور
  - release checklist قابل اجرا و تکرارپذیر

## Phase 7 - Optimization Loop (Continuous)
هدف: بهینه‌سازی مداوم بدون شکستن محصول
- Scope:
  - performance budget enforcement
  - regression-focused hardening
  - docs and API contract drift control
- Exit Criteria:
  - بهبود قابل اندازه‌گیری در پایداری/کارایی
  - بدون رگرشن در سناریوی smoke و گیت‌های اصلی

## Production Program
- برای نقشه راه تکمیلی تا سطح Production-grade:
  - `docs/ROADMAP_PRODUCTION_PHASED.md`

## Codex Import: Ops Hardening Pack (Membership)
- Scope:
  - import and index blueprint package under `docs/blueprints/codex-import/`
  - normalization utilities (`normalizeCreatorSlug`, `normalizeEmail`, `normalizeIranMobile`, `normalizeReturnUrl`)
  - callback safety hardening (amount mismatch + status consistency controls)
  - admin ops summary (`asdev.membership.ops.summary.v1`) API + minimal admin UI page
  - DB-backed membership worker jobs (reconcile, expire, token cleanup)
- Acceptance Criteria:
  - 20+ unit tests pass for normalization and malicious-input cases
  - replayed callbacks remain side-effect safe; mismatched amount never activates subscription
  - `GET /api/v1/admin/ops/summary` and `GET /api/admin/ops/summary` return deterministic JSON with `schema` and `generatedAt`
  - `pnpm -w worker:dev` processes queued jobs from `jobs` table
  - `pnpm -w jobs:enqueue:ops` enqueues membership maintenance jobs
  - runbooks for ops summary and worker operation are documented in `docs/RUNBOOKS/`
