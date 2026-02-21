# Membership Worker Runbook

## Commands
- Start worker loop:
```bash
pnpm -w worker:dev
```
- Enqueue periodic membership jobs:
```bash
pnpm -w jobs:enqueue:ops
```

## Implemented Job Types
- `MEMBERSHIP_PAYMENT_RECONCILE`
- `MEMBERSHIP_SUBSCRIPTION_EXPIRE`
- `MEMBERSHIP_DOWNLOAD_TOKEN_CLEANUP`

## Operational Notes
- Queue model: Postgres table `jobs`
- Leasing: `FOR UPDATE SKIP LOCKED` with expired lock reclaim
- Retry: exponential backoff with jitter until `max_attempts`
- Timeout: per-job `timeout_ms`

## Troubleshooting
1. Job stuck on `RUNNING`:
   - بررسی کنید `locked_at` خیلی قدیمی نباشد.
   - worker جدید lock منقضی‌شده را reclaim می‌کند.
2. Jobs failing repeatedly:
   - `last_error` را از جدول `jobs` بررسی کنید.
   - config درگاه/DB را verify کنید.
3. No jobs processed:
   - `pnpm -w jobs:enqueue:ops` اجرا شده باشد.
   - worker process در حال اجرا باشد.
