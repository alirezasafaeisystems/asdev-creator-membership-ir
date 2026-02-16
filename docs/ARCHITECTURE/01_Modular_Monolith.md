# 01 Modular Monolith

## هدف
شروع به صورت Modular Monolith (یک deploy، مرزبندی دامنه‌ای واضح) برای کاهش ریسک پرداخت/امنیت.

## Domain Boundaries (Initial)
- Identity & Access: auth + sessions
- Creator: profile
- Plans: pricing plans
- Subscription: state machine (MVP: `PENDING_PAYMENT` → `ACTIVE`)
- Payments: gateway adapter + idempotency
- Audit/Observability: audit_events + traceId

## Implementation Notes
- کد فعلی در `apps/api/src/*` به صورت ماژول‌های کوچک نگه داشته می‌شود.
- از اضافه کردن وابستگی‌های سنگین تا زمان نیاز اجتناب می‌شود.
