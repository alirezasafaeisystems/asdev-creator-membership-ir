# Runbook: اختلافات تسویه
نسخه: 1.1

## علائم رایج
- creator مبلغ تسویه را کمتر/بیشتر می بیند
- payment در payout دوبار شمارش شده
- payout در وضعیت processing گیر کرده

## triage
1. بررسی `payout_items` و uniqueness payment_id
2. بررسی وضعیت paymentهای ورودی
3. بررسی approval history و actor

## remediation
- duplicate تشخیص داده شد: rollback entry و ثبت audit
- payment غیرeligible: حذف از batch و اعلام به finance
- dispute رسمی: ticket + incident + گزارش ممیزی
