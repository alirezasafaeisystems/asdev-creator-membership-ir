# API (NestJS) — Contract Baseline
نسخه: 0.2

## هدف
API باید قراردادهای `docs/ARCHITECTURE/*` و `docs/API_DB_Deployment.md` را اجرا کند.

## boundary
- auth, creators, tiers, payments, memberships, assets, admin
- health endpoints

## اصول
- Base URL: `/api/v1`
- correlation_id روی مسیرهای حساس
- خطاها مطابق `docs/ARCHITECTURE/Error_Codes.md`
