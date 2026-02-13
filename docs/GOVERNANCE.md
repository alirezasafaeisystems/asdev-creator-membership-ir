# حاکمیت پروژه
نسخه: 1.1

## هدف
حاکمیت پروژه تضمین می کند تغییرات فنی، امنیتی، و محصولی به شکل قابل ممیزی و کم ریسک وارد سیستم شوند.

## نقش ها
- Product Owner: تایید scope و اولویت فاز
- Tech Lead: تایید طراحی فنی، مرزبندی دامنه، و ریسک اجرایی
- Security Reviewer: تایید تغییرات امنیتی و policy
- Release Owner: تصمیم نهایی برای release/rollback

## سطح تصمیم گیری
- Minor: تغییرات غیرحساس docs/tooling، تایید یک reviewer
- Standard: تغییرات اپلیکیشن یا قرارداد داخلی، تایید حداقل Tech Lead + یک reviewer
- Critical: auth/payment/payout/RBAC/data policy، تایید Product + Tech Lead + Security

## Approval Gateهای اجباری
- تغییر auth/role/permission
- تغییر schema شکستن سازگاری یا migration مخرب
- تغییر legal/policy حساس
- افزودن dependency جدید با ریسک runtime
- هر تغییر در payment/payout/download control

## ADR
برای موارد زیر ADR الزامی است:
- Local-first/runtime decision
- storage/auth/payment provider strategy
- breaking API/schema migration strategy
- dependency policy exception

مرجع قالب: `docs/ARCHITECTURE_DECISIONS/ADR-TEMPLATE.md`

## خط مشی PR
- هر PR باید Scope روشن، evidence تست، و ریسک/rollback داشته باشد.
- PR بدون پاس شدن gateهای quality قابل merge نیست.

## خط مشی release
- release فقط از برنچ main با tag نسخه ای انجام می شود.
- snapshot فاز قبل از release باید تولید و ممیزی شود.
