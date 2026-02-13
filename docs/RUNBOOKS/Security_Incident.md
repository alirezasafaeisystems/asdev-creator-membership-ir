# Runbook: رخداد امنیتی
نسخه: 1.1

## triggerها
- نشت secret
- bypass دسترسی admin/member
- replay abuse در callback پرداخت

## مراحل پاسخ
1. Triage: تعیین severity و scope
2. Containment: قطع دسترسی/rotating secrets/temporary block
3. Eradication: رفع ریشه مشکل
4. Recovery: بازگردانی سرویس و پایش
5. Postmortem: اقدام اصلاحی با owner و deadline

## evidence اجباری
- timeline رخداد
- indicatorها و logهای مرتبط
- تصمیم ها و owner هر اقدام
