# حفاظت محتوا
نسخه: 1.1

## مدل دسترسی
- پست ها visibility دارند: `public`, `members_only`, `tier_limited`
- دانلود asset فقط از endpoint مجاز انجام می شود.

## دانلود امن
- تولید signed URL کوتاه عمر
- bind به asset id و actor id
- rate limit روی دانلود
- امکان revoke فوری لینک

## کنترل های ضدسوءاستفاده
- ثبت تلاش های دانلود ناموفق در audit
- block موقت IP/actor در رفتار غیرعادی
- لاگ correlation_id برای forensic
