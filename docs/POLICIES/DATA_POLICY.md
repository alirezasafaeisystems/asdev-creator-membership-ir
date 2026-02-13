# سیاست داده
نسخه: 1.1

## طبقه بندی داده
- Public: محتوای عمومی creator/profile metadata
- Internal: داده های عملیاتی و analytics داخلی
- Sensitive: اطلاعات هویتی، payment metadata، رخدادهای امنیتی
- Restricted: secretها، tokenها، کلیدها، credentialها

## اصول پردازش
- حداقل گرایی داده (Data Minimization)
- دسترسی بر مبنای نقش و نیاز
- ثبت ممیزی برای دسترسی/تغییر داده حساس

## نگهداری و retention
- audit logs: حداقل 12 ماه
- payment/payout events: مطابق الزام مالی (حداقل 24 ماه)
- telemetry عملیاتی: حداقل لازم برای troubleshooting

## امنیت داده
- secret در repo ممنوع است.
- export داده حساس فقط برای عملیات مجاز و با ثبت ticket/incident.
- داده حساس در logها باید mask شود.

## حذف و اصلاح
- حذف داده باید traceable باشد.
- برای داده مالی یا ممیزی، حذف مستقیم بدون policy exception مجاز نیست.
