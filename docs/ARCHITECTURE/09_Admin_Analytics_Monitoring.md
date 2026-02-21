# 09 Admin Analytics and Monitoring

## Current Metrics
- active subscriptions
- pending payments
- failed payments (24h)
- callbacks (24h)
- subscriptions expiring in 7 days

## Operational Findings
- payment callback/idempotency anomalies
- amount/status inconsistencies
- stale pending reconciliations
- entitlement/content safety findings

## Monitoring Workflow
1. Pull ops summary endpoint.
2. Prioritize critical/high findings.
3. Execute runbook actions.
4. Re-check summary after remediation.
