# Worker Runbook — Membership

## Job Typeهای پیشنهادی
- `MEMBERSHIP_PAYMENT_RECONCILE`
- `MEMBERSHIP_SUBSCRIPTION_EXPIRE`
- `MEMBERSHIP_DOWNLOAD_TOKEN_CLEANUP`

## فایل کد
- `src/worker/membership.handlers.ts`

## نکته اجرایی
- callback ها real-time هستند؛ اما reconcile برای self-healing ضروری است.
- cleanup توکن‌ها برای کنترل DB و امنیت لازم است.
