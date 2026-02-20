# asdev-creator-membership-ir

Local-first creator membership platform with governance-first delivery.

## Current Status (Verified)
As of 2026-02-20:
- Quality gates are green: `docs:validate`, `lint`, `typecheck`, `local-first:scan`, `test`, `build`, `test:integration`, `test:e2e`
- Core flow is verified with smoke suite:
  - `signup -> creator -> plan -> checkout -> callback -> ACTIVE subscription`
- Adapter callback signature, RBAC admin policy, and content tokenized download are verified via smoke tests.
- Phased backlog is tracked without timeline and auto-synced from roadmap.

See:
- `docs/PROJECT_STATUS.md`
- `docs/ROADMAP_PHASED.md`

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

No Docker requirement:
- `DATABASE_URL=... pnpm -w local:stack:start`
- `pnpm -w local:stack:status`
- `pnpm -w local:stack:stop`
- Optional host reverse proxy (nginx installed locally):
- `pnpm -w local:proxy:start`
- `pnpm -w local:proxy:status`
- `pnpm -w local:proxy:stop`
- Full local automation (stack + proxy + seed + evidence):
- `pnpm -w run:local:full`

Quality gates:
- `pnpm -w docs:validate && pnpm -w lint && pnpm -w typecheck && pnpm -w local-first:scan && pnpm -w test && pnpm -w build`

Smoke test (mock payment):
- requires `DATABASE_URL`
- `pnpm -w smoke:mock-payment`
