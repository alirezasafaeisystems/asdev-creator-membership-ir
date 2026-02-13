# Modular Monolith
نسخه: 1.1

## مرزبندی ماژول ها
- `identity`
- `memberships`
- `payments`
- `payouts`
- `assets`
- `audit`
- `admin`
- `_kernel`

## قوانین وابستگی
- هر ماژول API داخلی خودش را expose می کند.
- import مستقیم از implementation داخلی ماژول دیگر ممنوع است.
- قراردادهای مشترک در `_kernel` نگهداری می شود.

## الگوی تعامل
- Sync call برای query ساده
- Domain event داخلی برای رخدادهای حساس (payment_succeeded, payout_approved)
- ثبت رویدادهای بحرانی در `audit`

## مزیت
این ساختار امکان رشد مرحله ای به microservice را بدون شکستن قرارداد فعلی فراهم می کند.
