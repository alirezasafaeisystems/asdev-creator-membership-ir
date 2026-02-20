# Project Status (Reality Check)

Last verified: 2026-02-20

## Verified Done
- API MVP is running:
  - Auth (`signup/signin/me`)
  - Creator + plan creation
  - Subscription checkout
  - Mock gateway callback
  - Audit/admin baseline endpoints
- Web app exists as local-first UI skeleton.
- Database schema and migrations run at API startup.
- Quality and governance gates are green:
  - `docs:validate`, `lint`, `typecheck`, `local-first:scan`, `test`, `build`, `test:integration`, `test:e2e`
- Real smoke flow is validated:
  - `signup -> creator -> plan -> checkout -> callback -> ACTIVE subscription`
  - duplicate callback remains safe (idempotent)
  - payment detail endpoint is owner-only
  - cancel flow transitions subscription to `CANCELED`
- Phase 1 API starts implemented:
  - `POST /api/v1/subscriptions/cancel`
  - `GET /api/v1/payments/:id` (owner-only)
  - `GET /api/v1/health/db`
- Phase 2 payment adapter baseline implemented:
  - multi-gateway adapter factory (`mock`, `idpay`)
  - webhook signature verification (`PAYMENT_WEBHOOK_SIGNATURE_INVALID`)
  - `pending/succeeded/failed` callback mapping
  - structured reconcile report via `POST /api/v1/payments/reconcile`
  - deterministic reconcile behavior in local mode (no pseudo-random status mutation)
  - payment event ledger (`payment_events`) for callback/reconcile traceability
- Phase 3 security baseline implemented:
  - admin authorization based on session role (no `x-admin-key`)
  - roles enforced: `platform_admin`, `support_admin`, `auditor`
  - tighter per-route rate limits for auth and callback routes
  - session lifecycle hardening: `auth/refresh`, `auth/signout`, `auth/signout-all`
- Latest local evidence run:
  - `.codex/local-evidence/latest.json` shows all gates and smoke suite passing.
- Phase 4 content-protection baseline implemented:
  - content metadata + publish endpoints
  - tokenized download URL (`GET /api/v1/download/:token`)
  - membership-gated access token issuance and download checks
- Phase 5 discovery baseline implemented:
  - public creator endpoints (`/api/v1/creators`, `/api/v1/creators/:slug`, `/api/v1/creators/:slug/plans`)
  - web public pages (`/creators`, `/creators/[slug]`)
  - SEO baseline (`sitemap`, page metadata, JSON-LD on creator page)
- Phase 6 ops baseline implemented:
  - local runtime scripts for `api` + `web` (no Docker dependency)
  - operational start/stop/status flow for local stack
  - optional host reverse-proxy runtime scripts (`local:proxy:start|status|stop`) for nginx-based local routing
  - end-to-end local runtime automation command (`pnpm -w run:local:full`)
- Phase 7 optimization baseline implemented:
  - performance budget checker (`pnpm -w perf:check`)
  - contracts drift checker (`pnpm -w contracts:check`)
  - consolidated regression smoke (`pnpm -w smoke:all`)
- Local runtime demo flow is executable end-to-end:
  - `pnpm -w seed:local-demo` creates creator/plan + buyer checkout/callback and verifies `SUCCEEDED` payment + `ACTIVE` subscription.
- Production hardening progress (new):
  - callback replay protection via `webhook_receipts` (duplicate webhook/callback guarded)
  - baseline security headers enforced at API edge (`nosniff`, `frame deny`, `referrer policy`, `permissions policy`)
  - database backup/restore automation scripts (`db:backup`, `db:restore`)

## Not Done Yet
- (current critical items: none for local-first runtime baseline)

## Progress Snapshot (Pragmatic)
- Engineering baseline and delivery pipeline: strong
- Core monetization MVP path: working with mock gateway
- Production readiness and feature-complete scope: still in progress

Use `docs/ROADMAP_PHASED.md` as the baseline no-deadline execution plan.
Use `docs/ROADMAP_PRODUCTION_PHASED.md` for production-grade phased execution.
