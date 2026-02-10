# Observability & SRE
نسخه: 1.1

## Telemetry اصولی
- telemetry فقط برای شاخص‌های عملیاتی/کیفی ضروری جمع‌آوری شود.
- analytics باید با کمینه‌سازی داده و بدون اطلاعات حساس انجام شود.

## خطا و هشدار
- خطاهای auth/payment/payout باید با severity مشخص log شوند.
- برای خطاهای مکرر callback یا ناهماهنگی payment/payout هشدار خودکار تعریف شود.

## SLO پایه
- موفقیت پردازش webhook پرداخت
- زمان پاسخ endpointهای auth و payment
- نرخ خطای 5xx مسیرهای حساس
