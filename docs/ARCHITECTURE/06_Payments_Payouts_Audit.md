# پرداخت/تسویه/ممیزی
نسخه: 1.2

## Payment Flow
- `payments/create`: ایجاد intent با amount و gateway
- `payments/callback`: پردازش idempotent با `gatewayRef` یکتا
- قبل از تغییر status، `payment_events` باید ذخیره شوند.

## Idempotency Rules
- callback تکراری نباید membership یا ledger را دوباره تغییر دهد.
- replay callback باید `PAYMENT_CALLBACK_REPLAY` ثبت کند.

## Payout Flow
- فقط paymentهای `succeeded` و settled وارد payout می شوند.
- `payout_items.paymentId` باید unique باشد.
- approval payout باید actor ادمین و timestamp داشته باشد.

## Audit
- برای payment/payout/admin action، trail شامل `who/when/what/why` ذخیره شود.
- رخدادهای بحرانی: `refund`, `dispute`, `manual_override`, `permission_change`

## Reconciliation
- گزارش روزانه ناهماهنگی payment/payout
- هر mismatch باید incident یا ticket عملیاتی تولید کند.
