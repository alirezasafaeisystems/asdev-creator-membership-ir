# جستجو و فیلترینگ
نسخه: 1.1

## محدوده MVP
- جستجوی creator بر اساس username/display_name
- جستجوی post بر اساس title/body
- فیلتر بر اساس category/date/sort

## قرارداد API
- `GET /api/v1/public/search/creators?q=...&page=...`
- `GET /api/v1/public/search/posts?q=...&page=...&sort=createdAt:desc`

## کیفیت نتایج
- حداقل طول query: 2 کاراکتر
- sort پیش فرض: مرتبط ترین سپس جدیدترین
- pagination پایدار

## پیاده سازی دیتابیس
- trigram برای creator fields
- full text search برای post fields
- indexهای متناسب با sort/filter
