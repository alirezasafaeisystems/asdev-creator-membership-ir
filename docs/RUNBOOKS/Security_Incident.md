# Security Incident Runbook

## Triage
1. Classify severity (`critical`, `high`, `medium`, `low`).
2. Capture trace IDs, impacted endpoints, and first-seen timestamp.
3. Assign incident commander and technical owner.

## Containment
1. Revoke compromised sessions/credentials.
2. Apply temporary blocks/rate limits for abusive vectors.
3. Isolate affected runtime path if blast radius is unknown.

## Recovery
1. Patch root cause and deploy rollback-safe fix.
2. Verify with targeted smoke checks and health endpoints.
3. Re-open traffic progressively and monitor error rates.

## Postmortem
1. Publish timeline + root cause + corrective actions.
2. Link remediation owners and due actions in roadmap/tasks.
