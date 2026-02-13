# مالکیت کد
نسخه: 1.1

## اصول
- هر مسیر مالک فنی مشخص دارد.
- تغییرات حوزه های حساس بدون تایید owner همان حوزه merge نمی شود.
- مالکیت کد با ownership واقعی تیم باید به روز نگه داشته شود.

## مالکیت مسیرها
- `apps/api/` -> backend maintainers
- `apps/web/` -> frontend maintainers
- `modules/identity/` -> identity owner
- `modules/payments/` -> payments owner
- `modules/payouts/` -> finance owner
- `modules/assets/` -> storage/content owner
- `modules/audit/` -> security/compliance owner
- `modules/admin/` -> admin console owner
- `docs/` -> architecture/governance maintainers
- `tools/` -> build-quality maintainers
- `ops/` -> SRE/infra maintainers

## اجرای عملی
- نگاشت رسمی ownerها در `.github/CODEOWNERS` نگهداری می شود.
- تغییرات بین حوزه ای باید حداقل یک reviewer از هر حوزه متاثر داشته باشد.
