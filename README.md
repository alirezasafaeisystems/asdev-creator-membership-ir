# asdev-creator-membership-ir

Local-first creator membership platform with governance-first delivery.

## Quick Start (Local)
Prereqs:
- Node.js 20+
- `pnpm`
- PostgreSQL (local or remote)

Install:
- `pnpm install`

Run API:
- set `DATABASE_URL` (see `.env.example` or `apps/api/.env.example`)
- `pnpm api:dev`

Run Web:
- `pnpm dev`

Quality gates:
- `pnpm -w docs:validate && pnpm -w lint && pnpm -w typecheck && pnpm -w local-first:scan && pnpm -w test && pnpm -w build`

Smoke test (mock payment):
- requires `DATABASE_URL`
- `pnpm -w smoke:mock-payment`
