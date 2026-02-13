# نمای کلی سیستم
نسخه: 1.1

## هدف سیستم
پلتفرم عضویت پولی creator با پرداخت ریالی، حفاظت محتوا، و پنل ادمین برای عملیات و تحلیل.

## اجزای اصلی
- Web App: صفحات عمومی creator، جستجو، onboarding کاربر
- API App: auth، tiers، payments، memberships، assets، admin APIs
- PostgreSQL: داده تراکنشی و ممیزی
- MinIO: ذخیره فایل خصوصی + signed URL
- Nginx: ingress محلی و health proxy

## جریان سطح بالا
1. کاربر login می کند.
2. عضویت/پرداخت ایجاد می شود.
3. callback در payment pipeline با idempotency پردازش می شود.
4. membership فعال می شود.
5. دانلود فایل فقط از مسیر signed URL و authorization gate ممکن است.

## اصول غیرعملکردی
- Local-first runtime
- Audit-by-default
- RBAC strict روی admin routes
- Correlation ID روی مسیرهای حساس
