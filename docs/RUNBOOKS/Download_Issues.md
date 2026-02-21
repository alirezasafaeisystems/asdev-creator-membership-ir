# Download Issues Runbook

## Symptoms
- valid member cannot download content
- token rejected/expired unexpectedly
- suspicious token issuance volume

## Actions
1. Validate content published state.
2. Validate active subscription for user/creator pair.
3. Re-issue token and verify TTL.
4. Review audit trail (`content.access_token.issue`, `content.download`).

## Escalation
- repeated abnormal token volume => treat as possible abuse.
