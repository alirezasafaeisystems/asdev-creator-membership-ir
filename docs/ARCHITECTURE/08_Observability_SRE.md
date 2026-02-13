# Observability & SRE
نسخه: 1.2

## Telemetry اصولی
- telemetry فقط برای شاخص های عملیاتی ضروری جمع آوری شود.
- analytics باید با کمینه سازی داده و بدون اطلاعات حساس انجام شود.

## Metrics پایه
- payment callback success rate
- payment callback replay rate
- asset download deny rate
- payout processing latency
- 5xx rate برای endpointهای حساس

## Logging
- structured logs با `correlation_id`, `actor_id`, `route`, `error_code`
- mask داده های حساس در log اجباری است.

## Alerting
- افزایش خطای callback یا mismatch payment/payout
- افزایش ناگهانی deny download
- خطاهای تکراری auth/admin

## SLO اولیه
- payment callback success >= 99.5%
- readiness API >= 99.9%
- p95 latency endpoint حساس < 500ms
