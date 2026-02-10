# استراتژی تست
نسخه: 1.0

## هدف
- اجرای کیفیت به‌صورت قابل تکرار بدون وابستگی به کد اپلیکیشن نهایی.
- جلوگیری از بازگشت placeholderها در مسیر CI.

## قرارداد اجرای تست
- `pnpm lint`: اعتبارسنجی syntax برای اسکریپت‌های shell و js (`tools/quality-lint.js`).
- `pnpm typecheck`: اعتبارسنجی قرارداد phase schema/gates/package scripts (`tools/quality-typecheck.js`).
- `pnpm test:unit`: اجرای validatorهای docs/security و بررسی فایل‌های حیاتی (`tools/quality-unit.js`).
- `pnpm test:integration`: اجرای gateهای تعریف‌شده در تمام فازها (`tools/quality-integration.js`).
- `pnpm test:e2e`: اجرای واقعی `phase-runner` در یک clone موقت و بررسی artifact/tag خروجی (`tools/quality-e2e.js`).

## معیار قبولی
- هیچ script در `package.json` برای `lint/typecheck/test:*` شامل `TODO` نباشد.
- همهٔ دستورات بالا باید روی clone تمیز قابل اجرا باشند.
- خروجی e2e باید شامل `snapshots/P0/manifest.json` و tag با الگوی `phase-P0-*` باشد.
