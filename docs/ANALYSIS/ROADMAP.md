# ROADMAP — فازبندی حرفه‌ای (ماژولار، قابل ارائه به عنوان نمونه‌کار)

> این Roadmap زمان‌بندی «تقویمی» نمی‌دهد؛ فازها «خروجی‌محور» هستند (مثل PersianToolbox) تا کیفیت قربانی نشود.

## فاز 0 — استاندارد پایه (Governance + Local‑First Gate)
**خروجی**
- لنت/تایپ‌چک/تست پایه در CI
- اسکن وابستگی خارجی (runtime) و قفل‌کردن خط قرمز
- چک‌لیست PR و Definition of Done

**پذیرش**
- هیچ اشاره‌ای به CDN/فونت خارجی در build خروجی نباشد
- محیط لوکال با Docker Compose بالا بیاید

## فاز 1 — هسته هویت و دسترسی
**خروجی**
- Auth کامل + Session/Refresh
- RBAC + Audit events
- Rate limit برای auth

**پذیرش**
- تست‌های واحد برای auth flows
- audit log برای رخدادهای حساس

## فاز 2 — Creator + Plans
**خروجی**
- ایجاد/ویرایش پروفایل کریتور
- slug پایدار
- تعریف پلن‌ها (ماهانه/سالانه)

**پذیرش**
- صفحات عمومی کریتور قابل ایندکس (SSR/SSG)

## فاز 3 — Subscription Engine
**خروجی**
- state machine
- cancellation/expiry
- grace period (اختیاری)
- کوپن (اختیاری)

**پذیرش**
- تست‌های سناریویی برای state transitions

## فاز 4 — Payments (Gateway Adapter)
**خروجی**
- پرداخت از طریق درگاه ایرانی با adapter
- callback idempotent
- reconciliation (ادمین)

**پذیرش**
- duplicate callback باعث دوبار فعال شدن اشتراک نشود
- گزارش خطاها + traceId

## فاز 5 — Content + Protection
**خروجی**
- آپلود/انتشار محتوا
- دسترسی بر اساس membership
- دانلود امن tokenized

**پذیرش**
- لینک مستقیم storage هرگز public نشود

## فاز 6 — Dashboards (User + Creator + Admin)
**خروجی**
- داشبورد کاربر: اشتراک/پرداخت/دانلود
- داشبورد کریتور: اعضا/درآمد/پلن‌ها
- ادمین: risk + moderation + payment monitoring

**پذیرش**
- KPIها (MRR, Active members, churn ساده) قابل مشاهده باشد

## فاز 7 — SEO + Performance + Observability
**خروجی**
- sitemap، metadata، JSON‑LD
- بودجه performance + lazy load
- logs/metrics + runbooks

**پذیرش**
- Lighthouse موبایل قابل قبول
- runbook برای payment issues وجود داشته باشد
