# مشارکت
نسخه: 1.1

## پیش نیاز
- Node.js 20+
- pnpm 9+
- git

## راهنمای branch
- feature: `feat/<scope>-<topic>`
- fix: `fix/<scope>-<topic>`
- docs: `docs/<topic>`
- chore: `chore/<topic>`

## روند کار
1. از `main` برنچ جدید بسازید.
2. تغییرات را محدود به یک scope نگه دارید.
3. gateها را اجرا کنید:
```bash
pnpm -w docs:validate
pnpm -w lint
pnpm -w typecheck
pnpm -w test:unit
pnpm -w test:integration
pnpm -w test:e2e
pnpm -w security:scan
```
4. PR باز کنید و template را کامل پر کنید.

## معیار merge
- همه checkها سبز باشند.
- reviewerهای لازم تایید داده باشند.
- برای تغییرات حساس، approval gate رعایت شده باشد.
