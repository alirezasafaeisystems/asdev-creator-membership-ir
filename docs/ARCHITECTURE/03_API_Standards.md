# استانداردهای API
نسخه: 1.1

## Base URL
- Base: `/api/v1`

## قرارداد پاسخ
```json
{
  "ok": true,
  "data": {},
  "meta": {"correlationId": "..."}
}
```

## قرارداد خطا
```json
{
  "ok": false,
  "error": {
    "code": "PAYMENT_CALLBACK_REPLAY",
    "message": "...",
    "correlationId": "..."
  }
}
```

## اصول
- مسیرهای admin فقط برای role مناسب
- pagination استاندارد: `page`, `pageSize`, `total`
- endpointهای callback باید idempotent باشند.
- version bump برای breaking change الزامی است.
