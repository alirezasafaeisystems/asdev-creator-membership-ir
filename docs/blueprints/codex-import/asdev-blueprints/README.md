# ASDEV — Blueprints اجرایی برای دو پروژه (Audit + Membership)

این بسته شامل **مستندات فنی اجرایی** + **اسکلت کد آماده** برای دو پروژه زیر است:

1) **Iran Readiness Audit** (جذب ترافیک/SEO + گزارش قابل اشتراک + تبدیل به لید/پرداخت)
2) **Creator Membership / Paywall** (لانچ سریع + درآمد سریع)

> تاریخ تولید: 2026-02-21  
> زبان: فارسی (با کد و TypeScript)

---

## ساختار پوشه‌ها

- `01-audit/` — همه مستندات و اسکلت کدهای پروژه Audit
- `02-membership/` — همه مستندات و اسکلت کدهای پروژه Membership
- `03-shared/` — اجزای مشترک (Queue/Worker Engine و الگوها)
- `00-guides/` — راهنمای اجرای مرحله‌ای (بدون زمان‌بندی) + چک‌لیست‌ها

---

## چگونه از این بسته استفاده کنم؟

1) اول `00-guides/START_HERE.md` را بخوانید.
2) برای هر پروژه، وارد پوشه همان پروژه شوید و فایل‌های زیر را دنبال کنید:
   - `docs/PHASES.md` (فازبندی و اهداف)
   - `docs/ROUTES_NEXTJS.md` (Routeهای دقیق)
   - `docs/FUNNEL.md` (قیف تبدیل)
   - `prisma/` (مدل‌های Prisma و پیشنهاد مهاجرت)
   - `src/` (کدهای آماده: normalize, rules, summary, worker handlers)

---

## یادداشت‌های مهم

- این بسته «Blueprint» است: **کدها و مدل‌ها آماده‌اند** ولی برای اجرای واقعی باید در ریپوی شما ادغام شوند.
- برای SSRF و امنیت URL در Audit از guardrail استفاده شده؛ در محیط production پیشنهاد می‌شود DNS‑rebind هم بررسی شود.
- Worker/Queue به‌صورت DB‑backed طراحی شده تا سریع و بدون وابستگی خارجی لانچ شود.

---

## نسخه‌بندی Summary JSON

خروجی گزارش‌ها به‌شکل versioned ذخیره می‌شود تا UI و API شما پایدار بماند:

- Audit: `asdev.audit.summary.v1`
- Membership Ops: `asdev.membership.ops.summary.v1`

---

## فایل‌های کلیدی سریع

- Shared Worker Engine: `03-shared/queue-worker/engine.ts`
- Audit URL Normalization: `01-audit/src/lib/normalizeAuditTargetUrl.ts`
- Audit Findings Rules: `01-audit/src/lib/rules.ts`
- Audit Summary Types: `01-audit/src/lib/summary.types.ts`
- Membership Normalize Slug/Identity/ReturnUrl: `02-membership/src/lib/*`
- Membership Ops Findings: `02-membership/docs/FINDINGS_OPS.md`

---

موفق باشید 🌱
