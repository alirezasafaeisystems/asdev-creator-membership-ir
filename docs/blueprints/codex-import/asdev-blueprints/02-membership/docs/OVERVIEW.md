# Creator Membership / Paywall — مستند فنی اجرایی (MVP)

## هدف محصول
- لانچ سریع و تبدیل سریع به درآمد
- تمرکز روی “First Sale” برای Creatorها
- کم کردن پشتیبانی با تحویل خودکار (download token + entitlement)

## تعریف MVP
Creator ثبت‌نام می‌کند → Creator page می‌سازد → Plan می‌سازد → Content آپلود می‌کند → لینک public را share می‌کند → Member پرداخت می‌کند → Subscription ACTIVE → دسترسی محتوا

## اصول مهم
- Callback درگاه باید **idempotent** باشد
- amount mismatch باید **fail** شود
- entitlement guard باید **مرکزی** باشد (همه دانلودها از یک guard عبور کنند)
- Ops Summary versioned برای admin/پشتیبانی

