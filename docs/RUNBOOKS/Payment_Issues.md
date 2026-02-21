# Payment Issues Runbook

## Symptoms
- payment stuck in `PENDING`
- callback replay bursts
- payment/subscription state mismatch

## Actions
1. Check `GET /api/v1/admin/ops/summary`.
2. Review payment events for target payment.
3. Trigger reconciliation (`POST /api/v1/payments/reconcile` or enqueue ops jobs).
4. Verify final status consistency (`payments` vs `subscriptions`).

## Escalation
- amount mismatch or repeated signature failures => security/payment provider escalation.
