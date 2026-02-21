# GUIDE — راهنمای استفاده از مستندات

این فایل برای وقتی است که بسته ZIP را باز کردید و می‌خواهید سریع بفهمید «از کجا شروع کنم».

## 1) اگر می‌خواهید سریع‌ترین خروجی را بگیرید
- اول Shared Queue را اضافه کنید: `03-shared/queue-worker/`
- بعد Audit را تا Phase D جلو ببرید (Scanner + Findings + Summary + Report UI)
- سپس Membership را تا Phase M3 جلو ببرید (Payment + Entitlement + Download token)

## 2) اگر الان فقط روی Audit تمرکز دارید
مسیر پیشنهادی:
- `01-audit/docs/PHASES.md` → Phase A تا D
- سپس `01-audit/src/worker/audit.handler.ts` را به worker شما وصل کنید
- سپس UI report را با `AuditRun.summary` بسازید

## 3) اگر الان فقط روی Membership تمرکز دارید
مسیر پیشنهادی:
- `02-membership/docs/PHASES.md` → Phase M1 تا M3
- callback idempotency را حتماً از روز اول enforce کنید
- guard مرکزی entitlement را روی دانلود قرار دهید

## 4) نکته یکپارچه‌سازی
این بسته شامل snippetهای Prisma است، یعنی:
- فایل‌های `schema.*.prisma` را در schema اصلی paste کنید
- نام‌ها و relationها را با schema فعلی‌تان هماهنگ کنید
- سپس migrate کنید

## 5) مسیر فایل‌های مهم
- Shared engine: `03-shared/queue-worker/engine.ts`
- Audit normalize URL: `01-audit/src/lib/normalizeAuditTargetUrl.ts`
- Audit rules: `01-audit/src/lib/rules.ts`
- Audit summary: `01-audit/src/lib/summary.types.ts`
- Membership normalizations: `02-membership/src/lib/normalizeSlug.ts` و ...
- Membership entitlement: `02-membership/src/lib/entitlementGuard.ts`

موفق باشید.
