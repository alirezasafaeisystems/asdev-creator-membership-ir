# ROADMAP Execution Autopilot (No Timeline)

این نقشه راه برای اجرای پیوسته و بدون توقف طراحی شده و زمان‌بندی تقویمی ندارد.

## Core Rule
- فقط کارهای لازم اجرا شود؛ کار تکراری حذف شود.
- هر مرحله باید evidence تولید کند.

## Phase A - Runtime Baseline
- Objective:
  - runtime کامل لوکال (db + api + web + proxy) همیشه قابل اجرا باشد.
- Execution:
  - `pnpm -w run:local:full`
- Exit:
  - `LOCAL_FULL_OK`

## Phase B - Data and Flow Reality
- Objective:
  - داده واقعی demo وجود داشته باشد و flow پرداخت کامل پاس شود.
- Execution:
  - `pnpm -w seed:local-demo`
- Exit:
  - payment `SUCCEEDED`
  - subscription `ACTIVE`
  - creators list non-empty

## Phase C - Security and Admin Control
- Objective:
  - مسیرهای admin با RBAC واقعی کنترل شوند.
- Execution:
  - `pnpm -w smoke:rbac-admin`
  - `GET /api/v1/admin/overview`
- Exit:
  - auditor/supported roles behavior verified
  - overview response shape validated

## Phase D - Continuous Hardening Loop
- Objective:
  - جلوگیری از drift و regression با حداقل اجرای تکراری.
- Execution:
  - `pnpm -w autopilot:phase-loop`
- Exit:
  - docs/contracts/perf gates green
  - evidence latest updated
  - `tasks/NEXT.md` synced
  - runtime health artifact updated (`.local-run/runtime/health.json`)

## Operator Commands
- One-shot full bootstrap:
  - `pnpm -w run:local:full`
- Non-redundant continuous loop:
  - `pnpm -w autopilot:phase-loop`
- Runtime health snapshot:
  - `pnpm -w runtime:health:report`
- Background daemon for continuous execution:
  - `pnpm -w autopilot:daemon:start`
  - `pnpm -w autopilot:daemon:status`
  - `pnpm -w autopilot:daemon:stop`

## Optional External Runner Integration
- External runner path:
  - `/home/dev/Project_Me/codex-roadmap-runner`
- Enable inside autopilot loop:
  - `AUTOPILOT_ROADMAP_RUNNER=1`
- Mode:
  - `AUTOPILOT_ROADMAP_MODE=semi` or `AUTOPILOT_ROADMAP_MODE=auto`
- Cooldown (seconds) to avoid repetitive runs:
  - `AUTOPILOT_ROADMAP_COOLDOWN_SEC=21600`
