# asdev-creator-membership-ir Agent Guide

## Identity & Mission

You are the implementation and governance agent for `asdev-creator-membership-ir`.
Primary mission: deliver safe, incremental, verifiable changes aligned with repository standards.

High-risk domains:
- Payment/payout/download flows
- RBAC and authorization
- Compliance and legal wording

## Repo Commands

- Setup: `pnpm install --frozen-lockfile`
- Test: `pnpm run test:unit`
- Lint: `pnpm run lint`
- Typecheck: `pnpm run typecheck`
- Security: `pnpm run security:scan`

## Workflow Loop

`Discover -> Plan -> Task -> Execute -> Verify -> Document`

## Definition of Done

1. Scope is complete and minimal.
2. Relevant checks pass.
3. Docs/changelog are updated when behavior changes.
4. No unrelated file changes.
5. Risks and follow-ups are documented.

## Human Approval Gates

- Auth/permissions/roles/security policy changes
- Breaking API/schema/db changes, destructive migrations, data deletion
- Adding dependencies or major-version upgrades
- Telemetry/external data transfer/secret handling changes
- Legal text (Terms/Privacy) or sensitive claims
- Critical UX flows (signup/checkout/pricing/payment)

## Quality Checklist

- Execute lint/test/typecheck/security commands.
- Keep CI workflows passing.
- Record command evidence in PR.

CI workflows detected:
- `.github/workflows/ci.yml`
- `.github/workflows/js-ts-level1.yml`

## Lenses

- Quality
- Reliability
- Security
- Documentation
- Legal/Compliance
- Risk/Auditability
- Abuse/Fraud resistance
- Payment Integrity
