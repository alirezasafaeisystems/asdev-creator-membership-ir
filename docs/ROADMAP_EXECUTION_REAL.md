# Roadmap Execution Real (No Timeline)

این سند یک نقشه راه اجرایی/عملیاتی واقعی است: فازمحور، بدون تاریخ، با خروجی قابل تحویل و معیار پذیرش دقیق.

## قواعد اجرایی
- بستن هر فاز فقط با خروجی واقعی + Evidence.
- هیچ انتقال ناقص به فاز بعدی مجاز نیست.
- تغییرات باید کوچک، rollback-safe، و قابل تست باشند.
- اگر یک gate قرمز باشد، فاز بسته نمی‌شود.

## Gateهای پایه (برای همه فازها)
- `pnpm -w docs:validate`
- `pnpm -w lint`
- `pnpm -w typecheck`
- `pnpm -w local-first:scan`
- `pnpm -w test`
- `pnpm -w build`

---

## فاز 0: Baseline تثبیت اجرا
### هدف
ایجاد baseline پایدار برای اجرا و تغییر امن.

### ورودی
- وضعیت فعلی پروژه و گیت‌ها
- `docs/PROJECT_STATUS.md`

### کارهای اجرایی
- صحت‌سنجی runbookها و commands اصلی
- حذف drift بین docs/tasks/runtime status
- ثبت evidence پایه

### خروجی قابل تحویل
- baseline سبز و reproducible
- status docs همگام با واقعیت runtime

### معیار پذیرش
- همه gateهای پایه سبز
- `docs/RUNTIME/LOCAL_STATUS.md` به‌روز

### فرمان‌های عملیاتی
- `pnpm -w evidence:record:gates`
- `pnpm -w status:local-report`

---

## فاز 1: پایداری چرخه پرداخت و اشتراک
### هدف
ایمن‌سازی کامل مسیر checkout -> callback -> subscription.

### ورودی
- API پرداخت/اشتراک
- runbook پرداخت

### کارهای اجرایی
- enforce callback idempotency + replay safety
- verify amount/status consistency قبل از activation
- پوشش smoke و تست سناریوهای شکست/تکرار

### خروجی قابل تحویل
- مسیر پرداخت بدون duplicate side-effect
- گزارش خطاهای پرداخت قابل ردگیری

### معیار پذیرش
- replay callback activation دوبل ایجاد نکند
- mismatch مبلغ activation را بلاک کند
- smoke پرداخت پاس شود

### فرمان‌های عملیاتی
- `pnpm -w smoke:mock-payment`
- `pnpm -w smoke:idpay-callback`

---

## فاز 2: امنیت دسترسی و RBAC
### هدف
تضمین کنترل دسترسی واقعی روی تمام مسیرهای حساس.

### ورودی
- role model (`platform_admin`, `support_admin`, `auditor`)
- endpointهای admin/auth

### کارهای اجرایی
- تست ماتریس RBAC روی endpointها
- بازبینی rate-limit روی auth/callback
- بازبینی header policy و session flow

### خروجی قابل تحویل
- admin routes با RBAC enforce شده
- مسیرهای auth/callback با کنترل abuse

### معیار پذیرش
- `smoke:rbac-admin` پاس
- مسیر غیرمجاز 403 پایدار برگرداند

### فرمان‌های عملیاتی
- `pnpm -w smoke:rbac-admin`
- `pnpm -w smoke:auth-session`

---

## فاز 3: حفاظت محتوا و entitlement
### هدف
تحویل محتوا فقط برای کاربر مجاز و عضو فعال.

### ورودی
- content publish/download flows
- tokenized download logic

### کارهای اجرایی
- validate membership guard در issuance/download
- بررسی path safety و token TTL
- پوشش سناریوهای unauthorized و expired token

### خروجی قابل تحویل
- content delivery امن و auditable

### معیار پذیرش
- non-member دسترسی نگیرد
- token منقضی reject شود
- smoke محتوا پاس شود

### فرمان‌های عملیاتی
- `pnpm -w smoke:content-download`

---

## فاز 4: عملیات خودکار (Worker + Jobs)
### هدف
خودترمیمی عملیاتی برای pending/expiry/cleanup.

### ورودی
- queue table + worker handlers
- ops summary findings

### کارهای اجرایی
- enqueue دوره‌ای jobهای membership
- monitor retry/timeout/failure behavior
- رفع stale pending با reconcile process

### خروجی قابل تحویل
- worker پایدار با job processing واقعی
- runbook اجرایی برای عملیات jobs

### معیار پذیرش
- jobها queue -> running -> success/fail را درست طی کنند
- retry/backoff behavior قابل مشاهده و پایدار باشد

### فرمان‌های عملیاتی
- `pnpm -w jobs:enqueue:ops`
- `pnpm -w worker:dev`

---

## فاز 5: دید عملیاتی و پاسخ به رخداد
### هدف
قابل‌مشاهده کردن سلامت سیستم برای تصمیم سریع.

### ورودی
- admin ops summary endpoint
- findings model

### کارهای اجرایی
- بازبینی findings و شدت‌بندی اقدامات
- تعریف playbook پاسخ به findingهای critical/high
- همگام‌سازی runbook با رخدادهای واقعی

### خروجی قابل تحویل
- پنل و endpoint عملیاتی قابل اتکا
- مسیر پاسخ به Incident مستند و اجرایی

### معیار پذیرش
- summary با schema/version پایدار برگردد
- findingهای critical مسیر پاسخ مشخص داشته باشند

### فرمان‌های عملیاتی
- `curl -H "authorization: Bearer <ADMIN_TOKEN>" http://127.0.0.1:4000/api/v1/admin/ops/summary`

---

## فاز 6: آمادگی انتشار Production-like
### هدف
کاهش ریسک انتشار با release workflow قابل تکرار.

### ورودی
- release runbook
- backup/restore scripts

### کارهای اجرایی
- اجرای dry-run انتشار + rollback
- تست سلامت پس از rollback
- ثبت evidence release decision

### خروجی قابل تحویل
- playbook انتشار و rollback معتبر

### معیار پذیرش
- build/release/rollback مسیر عملیاتی شکست‌ناپذیر داشته باشد
- پس از rollback smokeهای حیاتی سبز باشند

### فرمان‌های عملیاتی
- `pnpm -w db:backup`
- `pnpm -w db:restore`
- `pnpm -w smoke:all`

---

## فاز 7: چرخه بهینه‌سازی مستمر
### هدف
بهبود مستمر بدون رگرشن.

### ورودی
- baseline metrics + contracts + perf checks

### کارهای اجرایی
- اجرای loop منظم قرارداد/کارایی/رگرشن
- حذف مستندات سوخته و drift دوره‌ای
- کوچک‌سازی تغییرات و افزایش کیفیت فازها

### خروجی قابل تحویل
- روند پایدار کیفیت و پرفورمنس
- مستندات lean و همگام با کد

### معیار پذیرش
- regressions بحرانی تکرارشونده صفر شود
- docs drift کنترل‌شده باقی بماند

### فرمان‌های عملیاتی
- `pnpm -w contracts:check`
- `pnpm -w perf:check`
- `pnpm -w test:regression`
- `pnpm -w autopilot:phase-loop`

---

## Definition of Phase Done
هر فاز فقط زمانی Done است که:
1. خروجی قابل تحویل فاز کامل باشد.
2. معیارهای پذیرش همان فاز پاس شوند.
3. gateهای پایه سبز باشند.
4. runbook/docs/tasks مرتبط به‌روزرسانی شده باشند.
5. evidence اجرای فاز ثبت شده باشد.
