# ExecPlan — اجرای خودکار Roadmap (asdev-creator-membership-ir)

> هدف: اجرای سریع و قابل برگشت بدون مکث و بدون وابستگی جدیدِ پرریسک.

## Constraints
- فقط `pnpm`
- Local‑First: بدون CDN، بدون فونت خارجی، بدون وابستگی runtime به سرویس‌های خارجی
- تغییرات کوچک و تست‌پذیر + اجرای gates قبل از خروج

## Tasks
- [ ] اضافه کردن اسکریپت‌های استارت/اتوماسیون برای اجرای local (بدون Docker اجباری)
- [ ] اضافه کردن `.env.example` کامل برای `apps/api` و تکمیل `.env.example` ریشه (DATABASE_URL و …)
- [ ] اضافه کردن smoke script برای سناریوی mock payment (اگر `DATABASE_URL` موجود باشد)
- [ ] ثبت خروجی اتوماسیون در `.codex/roadmap-runs/<ts>/`

## Validation Gates
- [ ] `pnpm -w docs:validate`
- [ ] `pnpm -w lint`
- [ ] `pnpm -w typecheck`
- [ ] `pnpm -w local-first:scan`
- [ ] `pnpm -w test`
- [ ] `pnpm -w build`

## Exit Criteria
- [ ] همه آیتم‌های checklist تکمیل
- [ ] gates پاس یا blocker دقیق مستندسازی شده باشد
