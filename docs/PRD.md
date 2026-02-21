# PRD

## Product Goal
Build a local-first creator membership platform for Iran with reliable payments, secure content delivery, and admin-grade operations visibility.

## Primary Users
- Creator: creates plans, publishes gated content, tracks members/revenue.
- Member: subscribes, pays, accesses entitled content.
- Admin: monitors payments, incidents, and operational findings.

## Core Flows
1. Signup/signin with session management.
2. Creator onboarding and plan creation.
3. Checkout + callback idempotency.
4. Subscription activation/cancel/expiry lifecycle.
5. Membership-gated content token + download.
6. Admin ops summary and reconciliation actions.

## Non-Functional Requirements
- Local-first runtime (no external runtime dependencies).
- Deterministic callback behavior and replay safety.
- RBAC on admin endpoints.
- Audit trail for sensitive actions.
- Reproducible local setup and quality gates.
