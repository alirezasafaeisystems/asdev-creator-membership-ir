# Ops Summary Runbook

## Endpoint
- `GET /api/v1/admin/ops/summary`
- Alias: `GET /api/admin/ops/summary`
- Auth: `Authorization: Bearer <admin-session-token>`
- Roles: `platform_admin`, `support_admin`, `auditor`

## Response Contract
- `schema`: `asdev.membership.ops.summary.v1`
- `generatedAt`: ISO timestamp
- `metrics`: active subscriptions, pending payments, failed/callbacks last 24h, expiring in 7d
- `findings`: deterministic operational/security findings

## Quick Checks
1. اگر `PAYMENT_AMOUNT_MISMATCH` دارید:
   - `payment_events.raw.reason=amount_mismatch` را بررسی کنید.
   - plan price و payment amount را مقایسه کنید.
2. اگر `PENDING_PAYMENTS_NOT_RECONCILED` دارید:
   - `pnpm -w jobs:enqueue:ops` اجرا کنید.
   - worker را اجرا کنید: `pnpm -w worker:dev`.
3. اگر `EXPIRED_SUBSCRIPTION_STILL_HAS_ACCESS` دارید:
   - job expiration را enqueue/run کنید.

## cURL Example
```bash
curl -sS \
  -H "authorization: Bearer $ADMIN_TOKEN" \
  http://127.0.0.1:4000/api/v1/admin/ops/summary | jq
```
