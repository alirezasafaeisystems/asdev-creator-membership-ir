# پرداخت/تسویه/ممیزی
نسخه: 1.1

## پرداخت (Payment)
- تمام callbackهای payment gateway باید idempotent باشند.
- `gatewayRef` باید یکتا باشد تا از دوباره‌پردازش جلوگیری شود.
- رخدادهای webhook قبل از اعمال وضعیت، ثبت ممیزی شوند.

## تسویه (Payout)
- هر payout باید به payment معتبر و وضعیت تسویه‌شده متصل باشد.
- عملیات payout شامل approval و ثبت actor مدیریتی است.

## ممیزی (Audit)
- برای payment و payout باید trail شامل `who/when/what` نگهداری شود.
- رخدادهای بحرانی (refund/dispute/manual override) نیازمند log و بازبینی هستند.
