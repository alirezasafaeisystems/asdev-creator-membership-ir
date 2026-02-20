# 03 Test Strategy

## Goals
- Keep delivery reversible and low-risk.
- Verify both code quality and real business flow.
- Fail fast on governance/security violations.

## Test Pyramid (Current)
- Static/Policy checks:
  - `pnpm -w docs:validate`
  - `pnpm -w lint`
  - `pnpm -w typecheck`
  - `pnpm -w local-first:scan`
- Unit/contract checks:
  - `pnpm -w test` (`tools/quality-unit.js`)
- Integration gates:
  - `pnpm -w test:integration` (`tools/quality-integration.js`)
- End-to-end workflow checks:
  - `pnpm -w test:e2e` (`tools/quality-e2e.js`)
  - `pnpm -w smoke:mock-payment` (requires `DATABASE_URL`)

## Required PR Gate
Minimum required before merge:
- `pnpm -w docs:validate`
- `pnpm -w lint`
- `pnpm -w typecheck`
- `pnpm -w local-first:scan`
- `pnpm -w test`
- `pnpm -w build`

Recommended for release/hardening branches:
- `pnpm -w test:integration`
- `pnpm -w test:e2e`
- `pnpm -w smoke:mock-payment`

## Evidence Rules
- If any gate fails, do not mark task done.
- If smoke cannot run (e.g., no `DATABASE_URL`), explicitly log that as a verification gap.
- Keep outputs short and actionable; preserve failing command and error.

## Definition of Done Link
Task completion is valid only when this strategy and `docs/DEVELOPMENT/Definition_of_Done.md` are both satisfied.
