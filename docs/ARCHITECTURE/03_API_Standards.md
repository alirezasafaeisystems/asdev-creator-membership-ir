# 03 API Standards

## Versioning
- REST: `/api/v1/...`

## Error Model (REST)
پاسخ خطا:
```json
{ "code": "RATE_LIMITED", "message": "Too many requests", "details": {}, "traceId": "..." }
```

## TraceId
- هر درخواست باید `x-trace-id` در response داشته باشد.
- client می‌تواند `x-trace-id` را در request ارسال کند.

## Idempotency
- برای `POST /api/v1/subscriptions/checkout` پشتیبانی از `Idempotency-Key` header.
- callback پرداخت باید idempotent باشد و دوبار فعال‌سازی رخ ندهد.

## Auth
- فعلاً Bearer token session:
  - `Authorization: Bearer <session.token>`

## Rate Limit
- baseline ساده per-IP/per-route در API.
