# Production Payment Go-Live Runbook

## Scope
Execute Production Phase A for payment go-live readiness with evidence.

## Required Env
- `DATABASE_URL`
- `PAYMENT_GATEWAY_WEBHOOK_SECRET`

## Execution
1. Rotate next webhook secret artifact:
   - `pnpm -w payment:secret:rotate`
2. Execute phase automation:
   - `DATABASE_URL=... PAYMENT_GATEWAY_WEBHOOK_SECRET=... pnpm -w production:phase-a`

## Evidence Output
- `.codex/production-evidence/<timestamp>-phase-a/summary.md`
- smoke logs (`smoke-idpay.log`, `smoke-mock.log`)
- jobs enqueue log
- secret rotation log

## Acceptance
- IDPay callback smoke passes with replay-safe behavior.
- Payment callback flow remains idempotent.
- Membership ops jobs are enqueued successfully.
