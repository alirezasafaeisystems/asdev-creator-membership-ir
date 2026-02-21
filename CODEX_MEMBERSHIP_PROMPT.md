You are Codex running in the repository root of `asdev-creator-membership-ir` on my machine.
My local directory is already a git repo connected to GitHub (gh is available, but do not require network unless necessary).
I have copied the blueprint/pack files you gave me earlier into the REPO ROOT (same project). Your job is to discover them, ingest them, update our roadmap, then implement them in a real, executable way.

# 0) Absolute rules
- MUST follow existing repo governance/instructions first: read `AGENTS.md` and any `.codex/` config and comply.
- Keep changes minimal, additive, and aligned with existing architecture.
- Prefer existing code patterns, naming, folder structure, scripts, and quality gates already present.
- Do NOT add unrelated features. No big refactors.
- Keep secrets out of repo; use `.env.example` only.
- Ask for approval only if required (e.g., network access). Otherwise proceed autonomously.
- After each milestone, run the smallest relevant checks (typecheck/tests for the changed area). If full workspace gates exist, run them at the end.

# 1) First: repository discovery + blueprint ingestion
1) Print:
   - current branch, git status, node version, pnpm version.
2) Locate the imported blueprint files I placed in repo root.
   - Search for these markers/paths (in order):
     - `00-guides/START_HERE.md`
     - `00-guides/CHECKLISTS.md`
     - folders like `02-membership/`, `03-shared/`
     - any file containing `asdev.membership.ops.summary.v1` or `normalizeReturnUrl` or `normalizeCreatorSlug`
   - If you cannot find them, STOP and report exactly what you searched.
3) Move the imported blueprint files into a standard docs location (without losing anything):
   - Create: `docs/blueprints/codex-import/`
   - Move or copy (prefer move) the imported folders there.
   - Add `docs/blueprints/codex-import/INDEX.md` summarizing what was imported and where it came from.
4) Update roadmap:
   - Open and read `docs/ROADMAP_PHASED.md` and `docs/PROJECT_STATUS.md`.
   - Add a new section at the end of `docs/ROADMAP_PHASED.md` titled:
     "Codex Import: Ops Hardening Pack (Membership)"
   - Under it, add a phased checklist with acceptance criteria that matches what you will implement below.
   - Also add/refresh any task tracking files in `tasks/` if this repo uses auto-sync.

# 2) Implementation scope (Membership ops hardening pack)
Implement these items end-to-end (real code + tests + docs + runnable scripts).
If similar functionality already exists, extend/align; do not duplicate.

## 2.1 Normalization utilities (MVP)
- Implement:
  - `normalizeCreatorSlug(input) -> { slug, warnings }`
  - `normalizeEmail(input) -> string`
  - `normalizeIranMobile(input) -> string | null` (output: 09xxxxxxxxx)
  - `normalizeReturnUrl(input) -> string` (relative-only, block // and /api)
- Place them where existing shared libs live (detect existing `src/lib` or similar).
- Add unit tests with existing test stack. If no unit test runner exists, add minimal Vitest config without disturbing existing tooling.

Acceptance:
- 20+ unit tests across these functions, including edge cases and malicious inputs.

## 2.2 Payment callback idempotency & safety checks (MVP)
- Ensure callback/webhook handling is idempotent:
  - Use/ensure a `WebhookReceipt` (or equivalent) table with a uniqueness constraint on `(provider, externalId)`.
  - On callback receipt:
    - create receipt first (transaction)
    - if duplicate => return OK without side effects
- Add safety checks:
  - Amount mismatch => do not activate subscription; store event; mark suspicious.
  - Status consistency: payment succeeded must lead to ACTIVE subscription exactly once.

Acceptance:
- A replayed callback does not double-activate.
- Amount mismatch is detected and logged as an ops finding.

## 2.3 Ops findings scanner + Ops summary JSON v1
- Implement an ops finding model in code (not necessarily DB) and an aggregator to compute an ops health summary:
  - Schema: `asdev.membership.ops.summary.v1`
  - metrics: active subs, pending payments, failed last 24h, callbacks last 24h, expiring next 7d
  - findings: 10 golden ops findings:
    1) PAYMENT_CALLBACK_IDEMPOTENCY
    2) PAYMENT_AMOUNT_MISMATCH
    3) PAYMENT_STATUS_INCONSISTENT
    4) SUBSCRIPTION_DOUBLE_ACTIVE_SAME_PLAN
    5) EXPIRED_SUBSCRIPTION_STILL_HAS_ACCESS
    6) DOWNLOAD_TOKEN_ABUSE
    7) UNPUBLISHED_CONTENT_ACCESSIBLE
    8) OPEN_REDIRECT
    9) AUTH_RATE_LIMIT_MISSING (if repo has rate limit markers; otherwise implement minimal guard or a TODO finding)
    10) PENDING_PAYMENTS_NOT_RECONCILED
- Add an admin-only API endpoint that returns this JSON summary:
  - Example: `GET /api/admin/ops/summary`
  - Must enforce admin auth using the repo’s existing auth/RBAC system.

Acceptance:
- Endpoint returns stable JSON with `schema` and `generatedAt`.
- All findings are computed deterministically from DB state.

## 2.4 Worker/automation jobs (use existing queue infra if present)
- Detect if this repo already has a DB-backed queue/worker.
  - If yes: register new job types and handlers within existing framework.
  - If no: implement minimal DB-backed Job queue (as per imported blueprint) using Prisma with SKIP LOCKED leasing, retry/backoff, timeout with AbortSignal.
- Implement job handlers:
  - `MEMBERSHIP_PAYMENT_RECONCILE` (safe no-op if provider API missing; still mark stale pending payments as findings; optionally transition to FAILED after threshold)
  - `MEMBERSHIP_SUBSCRIPTION_EXPIRE` (set ACTIVE -> EXPIRED when period end passed)
  - `MEMBERSHIP_DOWNLOAD_TOKEN_CLEANUP` (delete expired tokens)
- Add scripts:
  - `pnpm -w worker:dev` (or consistent naming)
  - `pnpm -w jobs:enqueue:ops` to enqueue periodic jobs manually for MVP

Acceptance:
- Running worker locally processes queued jobs and updates DB.
- Timeouts/retries work (forced failing job retries then fails cleanly).

## 2.5 Minimal admin UI page
- Add a minimal admin page to view ops summary:
  - `/admin/ops`
  - Shows metrics + findings list (server-render or client fetch; follow repo conventions)
- Must be protected by admin RBAC.

Acceptance:
- Non-admin cannot access.
- Admin sees summary and findings.

# 3) Verification
- Run:
  - typecheck for affected workspaces
  - unit tests
  - a minimal smoke path for callback idempotency if test harness exists
- Update docs:
  - `docs/runbooks/ops-summary.md`
  - `docs/runbooks/worker.md` (or extend existing)

# 4) Output at the end
Print:
- What was implemented vs stubbed
- Exact commands to run locally (DB, migrate, dev servers, worker, enqueue)
- Any follow-up items added to roadmap

Proceed now.
