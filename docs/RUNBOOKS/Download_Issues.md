# Runbook: مشکلات دانلود
نسخه: 1.1

## علائم رایج
- دریافت 403 در دانلود
- لینک منقضی شده
- rate limit غیرعادی

## triage
1. بررسی active membership
2. بررسی policy visibility پست/فایل
3. بررسی TTL signed URL
4. بررسی لاگ deny با correlation_id

## remediation
- عضویت منقضی: راهنمای تمدید
- لینک منقضی: تولید URL جدید
- سوءاستفاده احتمالی: block موقت + incident
