# 04 Automation PhaseRunner

## Phase Runner (Repo)
این ریپو یک phase runner داخلی دارد:
- config: `tools/phase-runner/phases.json`
- اجرا: `pnpm -w phase:run <PHASE_ID>`
- خروجی: `snapshots/<PHASE_ID>/manifest.json` و `snapshots/<PHASE_ID>/report.md`

## Roadmap Runner (External Kit)
در مسیر جدا:
- `/home/dev/Project_Me/codex-roadmap-runner`

اجرای آن از داخل ریپو:
- `pnpm -w roadmap:auto`
- `pnpm -w roadmap:semi`

خروجی:
- `.codex/roadmap-runs/<timestamp>/summary.md`

ادغام با اتوپایلوت داخلی (اختیاری و non-blocking):
- `AUTOPILOT_ROADMAP_RUNNER=1 pnpm -w autopilot:phase-loop`
- mode:
  - `AUTOPILOT_ROADMAP_MODE=semi|auto`
- cooldown:
  - `AUTOPILOT_ROADMAP_COOLDOWN_SEC=21600`

اگر sandbox داخلی Codex روی این میزبان مشکل داشته باشد، phase runner داخلی همچنان برای gates کافی است.

## Backlog Sync Automation
برای همگام‌سازی خودکار `tasks/NEXT.md` با `docs/ROADMAP_PHASED.md`:
- `pnpm -w roadmap:sync-next`
برای همگام‌سازی برد Production با `docs/ROADMAP_PRODUCTION_PHASED.md`:
- `pnpm -w roadmap:sync-next:production`

این فرمان زمان‌بندی تقویمی اضافه نمی‌کند و فقط board فازمحور را بازتولید می‌کند.
وضعیت فازها از این به بعد باید evidence-aware باشد (اتکا به اجرای موفق gate/smoke)، نه صرفا وجود فایل/کد.

## Smoke Automations
- `pnpm -w smoke:mock-payment`
- `pnpm -w smoke:idpay-callback`
- `pnpm -w smoke:rbac-admin`
- `pnpm -w smoke:content-download`
- `pnpm -w smoke:all`

## Optimization Checks
- `pnpm -w contracts:check`
- `pnpm -w perf:check`

## Local Runtime Automation
- stack:
  - `DATABASE_URL=... pnpm -w local:stack:start`
  - `pnpm -w local:stack:status`
  - `pnpm -w local:stack:stop`
- reverse proxy (host nginx, optional):
  - `pnpm -w local:proxy:start`
  - `pnpm -w local:proxy:status`
  - `pnpm -w local:proxy:stop`
- full runtime (postgres + stack + proxy + seed + gates evidence + roadmap sync):
  - `pnpm -w run:local:full`
- non-redundant phase loop:
  - `pnpm -w autopilot:phase-loop`
- background daemon:
  - `pnpm -w autopilot:daemon:start`
  - `pnpm -w autopilot:daemon:status`
  - `pnpm -w autopilot:daemon:stop`

## Evidence Recording (Local)
- `pnpm -w evidence:record`
- `pnpm -w evidence:record:gates`
- `pnpm -w evidence:record:smoke`
- نکته: در modeهای `all` و `gates`، فرمان `pnpm -w roadmap:sync-next` هم ثبت می‌شود تا `tasks/NEXT.md` evidence-driven بماند.
- نکته: در loop خودکار، `roadmap:sync-next:production` هم اجرا می‌شود تا `tasks/NEXT_PRODUCTION.md` به‌روز بماند.
- artifacts:
  - `.codex/local-evidence/<run-id>/result.json`
  - `.codex/local-evidence/latest.json`
