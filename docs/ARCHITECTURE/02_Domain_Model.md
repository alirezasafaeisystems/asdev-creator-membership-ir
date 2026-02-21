# 02 Domain Model

## Core Entities
- `users`, `sessions`
- `creators`, `plans`
- `subscriptions`, `payments`, `payment_events`, `webhook_receipts`
- `contents`, `audit_events`
- `jobs` (worker queue)

## Key Relationships
- one creator belongs to one user
- one plan belongs to one creator
- one payment belongs to one subscription
- one subscription links user + creator + plan

## Invariants
- callback replay must not duplicate side effects
- payment `SUCCEEDED` should activate subscription once
- content download requires active membership entitlement
- admin endpoints require role-based authorization
