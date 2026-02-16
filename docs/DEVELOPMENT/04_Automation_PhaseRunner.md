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

اگر sandbox داخلی Codex روی این میزبان مشکل داشته باشد، phase runner داخلی همچنان برای gates کافی است.
