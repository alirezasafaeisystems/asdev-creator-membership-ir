# Runbook: مشکلات پرداخت
نسخه: 1.1

## علائم رایج
- callback دیررس یا تکراری
- payment status نامعتبر
- mismatch بین payment و membership

## triage
1. بررسی `gatewayRef` و uniqueness
2. بررسی payment_events و ترتیب ورود
3. بررسی audit trail و correlation_id

## remediation
- replay معتبر: فقط ثبت رویداد، بدون state duplicate
- callback ناقص: mark به failed با error code استاندارد
- mismatch membership: اجرای reconcile job و ثبت incident
