# پنل ادمین
نسخه: 1.1

## اهداف
- troubleshooting پرداخت، دانلود، و تسویه
- مدیریت role/permission با ممیزی کامل
- پایش KPIهای عملیاتی

## بخش ها
- Payments Explorer: search/filter + event drill-down
- Asset Access Monitor: بررسی خطاهای دانلود و abuse
- Payout Operations: approval queue + dispute handling
- Security Events: incident timeline

## کنترل دسترسی
- `admin`: دسترسی کامل عملیاتی
- `finance_admin`: payout/payments read + payout actions
- `support_admin`: مشاهده و رفع issueهای کاربر

## اصول UX عملیاتی
- هر action حساس باید confirm + reason داشته باشد.
- هر mutation باید audit id تولید کند.
