# COMPETITIVE_ANALYSIS_IR — تحلیل رقابتی و نقاط تمایز (بازار ایران)

## واقعیت بازار ایران
- کریتورهای ایرانی عمدتاً از:
  - کانال VIP تلگرام + پرداخت دستی
  - فایل‌فروشی ساده
  - دوره‌فروشی جداگانه
  استفاده می‌کنند.
- مشکل اصلی: نبود «عضویت واقعی» با مدیریت اتومات و تجربه کاربری پایدار.

## رقبای داخلی (الگوهای رایج)
> نام‌ها را اینجا عمداً عمومی نگه داشتم؛ تمرکز روی الگوهاست، نه برندها.
- فروش اشتراک تلگرام (Paywall ساده)
- سایت‌های دوره و فایل (بدون چرخه عمر subscription قوی)
- مارکت‌های محتوا (مالکیت کاربر/کریتور ضعیف)

## شکاف‌های رایج رقبا
- عدم وجود چرخه عمر درست subscription (grace period, retry, cancellation reasons)
- داشبورد تحلیلی ضعیف (MRR, churn, cohort retention)
- امنیت محتوای ضعیف (لینک مستقیم دانلود، نبود watermark/token)
- UX ضعیف روی موبایل و اینترنت کند
- وابستگی به ابزارهای خارجی (فونت/CDN/آنالیتیکس) و شکنندگی در ایران

## نقاط تمایز پیشنهادی (Feature Differentiation)
### 1) Local‑First واقعی (مزیت برند)
- هیچ external runtime
- فونت‌ها self-host
- اسکریپت‌ها داخلی
- تجربه آفلاین/اینترنت کند برای صفحات داشبورد

### 2) Content Protection حرفه‌ای
- دانلود tokenized + expiry
- watermark برای فایل‌های حساس (اختیاری)
- rate limiting + anomaly detection ساده (IP hash, device fingerprint سبک)

### 3) Subscription Engine استاندارد
- state machine واضح
- idempotent payments
- auditability و export logs برای کریتور

### 4) Creator‑centric UX
- صفحه پلن‌ها شفاف
- مزایا قابل مقایسه
- onboarding مرحله‌ای کریتور

### 5) SEO/Discovery
- صفحات عمومی کریتور SSG
- اسکیمای JSON‑LD برای پروفایل و پلن‌ها
- دسته‌بندی‌ها و جستجو

## پیشنهاد بسته‌بندی برای نمونه‌کار (Portfolio)
- تأکید روی:
  - Local‑First policy + اسکن وابستگی خارجی
  - Payment adapter معماری تمیز
  - Subscription lifecycle + tests
  - Observability/runbooks
