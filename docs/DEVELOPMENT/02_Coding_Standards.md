# استاندارد کدنویسی
نسخه: 1.1

## اصول
- تغییرات کوچک، هدفمند، و قابل بازبینی
- عدم دستکاری فایل های خارج از scope
- مستندسازی تصمیم های حساس با ADR

## naming
- مسیرها و فایل ها: lowercase با dash/underscore
- شناسه های دامنه: صریح و قابل جستجو

## خطا و لاگ
- استفاده از error code پایدار
- مسیرهای حساس باید `correlation_id` داشته باشند.
- log نباید شامل secret یا داده حساس خام باشد.

## policy تغییرات حساس
- auth/payment/payout/RBAC نیازمند approval gate
- migration مخرب بدون rollback plan ممنوع است.

## الزامات PR
- summary دقیق
- evidence اجرای gateها
- ریسک ها و plan rollback
