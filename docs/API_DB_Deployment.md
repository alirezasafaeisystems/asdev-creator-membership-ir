# API / DB / Deployment

## API
- Runtime: Fastify (`apps/api`)
- Entry: `apps/api/src/server.ts`
- Core domains: auth, creator/plans, subscriptions, payments, content, admin.

## Database
- Engine: PostgreSQL
- Schema: `apps/api/db/schema.sql`
- Migration mode: schema bootstrapped at API startup (`runMigrations`).

## Deployment Model
- Local-first primary mode (no Docker dependency required).
- Optional compose/proxy only as convenience fallback.
- Release readiness validated by docs + lint + typecheck + tests + build + smoke.

## Operational Commands
- API dev: `pnpm api:dev`
- Full build: `pnpm -w build`
- Local full runtime: `pnpm -w run:local:full`
