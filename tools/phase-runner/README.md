# Phase Runner
نسخه: 1.1
تاریخ: 2026-02-13

## اجرا
```bash
node tools/docs-validator/validate.js
./tools/phase-runner/run.sh P0
```

## خروجی
- `snapshots/<PHASE>/manifest.json`
- `snapshots/<PHASE>/report.md`

## رفتار commit/tag/push
- در حالت پیش فرض push خاموش است.
- برای push خودکار branch/tag:
```bash
PHASE_RUNNER_PUSH=1 ./tools/phase-runner/run.sh P0
```
