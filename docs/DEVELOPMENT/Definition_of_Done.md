# Definition of Done
نسخه: 1.1

## DoD پایه برای هر PR
- scope محدود و روشن
- بدون placeholder در فایل های هدف
- عدم ایجاد تناقض بین docs/tools/workflow
- اجرای موفق gateهای اجباری

## Gateهای اجباری
```bash
pnpm -w docs:validate
pnpm -w lint
pnpm -w typecheck
pnpm -w test:unit
pnpm -w test:integration
pnpm -w test:e2e
pnpm -w security:scan
```

## DoD تغییرات حساس
برای auth/payment/payout/policy:
- approval gate کامل
- مستند ریسک و rollback
- ثبت ADR (در صورت تغییر معماری)
