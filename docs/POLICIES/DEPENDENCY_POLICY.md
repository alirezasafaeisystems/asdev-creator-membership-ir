# سیاست وابستگی ها (Local-first)
نسخه: 1.1

## اصول
- runtime نباید به CDN یا سرویس خارجی وابسته باشد.
- افزودن dependency باید با دلیل فنی، ریسک، و plan نگهداری همراه باشد.

## قوانین پذیرش dependency
- مجوز (license) قابل قبول باشد.
- maintenance فعال باشد.
- CVE بحرانی باز نداشته باشد یا mitigation مشخص باشد.
- امکان self-host برای runtime dependency وجود داشته باشد.

## ممنوعیت ها
- dependency که data egress ناخواسته ایجاد کند.
- dependency بدون مالک مشخص در تیم.
- dependency که lockfile/reproducible build را نقض کند.

## استثنا
هر استثنا نیازمند ADR و تایید Tech Lead + Security Reviewer است.
