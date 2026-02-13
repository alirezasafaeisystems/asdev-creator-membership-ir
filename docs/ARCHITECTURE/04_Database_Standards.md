# استانداردهای دیتابیس
نسخه: 1.1

## naming
- table: `snake_case` جمع
- column: `snake_case`
- PK: `id` (uuid)
- FK: `<entity>_id`

## migration
- migration باید reversible یا دارای rollback plan باشد.
- migration مخرب نیازمند approval gate است.
- قبل از migration روی prod، backup اجباری است.

## index و constraint
- index فقط روی query path واقعی
- unique constraint برای invariants دامنه
- check constraint برای stateهای حساس

## auditability
- جداول حساس باید `created_at`, `updated_at`, `created_by` یا مسیر معادل داشته باشند.
