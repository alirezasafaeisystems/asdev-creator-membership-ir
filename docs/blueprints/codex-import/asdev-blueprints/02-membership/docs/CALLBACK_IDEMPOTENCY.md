# Idempotency در Callback — Membership

## مشکل
درگاه‌ها ممکن است:
- callback را چندبار ارسال کنند
- کاربر چندبار refresh کند
- شبکه باعث retry شود

## راهکار (MVP)
- جدول `WebhookReceipt` با unique(provider, externalId)
- در شروع callback:
  1) receipt را create کنید
  2) اگر unique violation خورد → early return (قبلاً پردازش شده)

## نکته مهم
- Activation subscription باید transactional باشد
- amount mismatch باید fail شود
