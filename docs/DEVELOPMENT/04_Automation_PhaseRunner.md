# اتوماسیون و Phase Runner
نسخه: 1.2

## هدف
`phase-runner` برای تولید snapshot قابل ممیزی از هر فاز استفاده می شود.

## ورودی
- `tools/phase-runner/phases.json`
- وضعیت clean working tree

## خروجی
- `snapshots/<PHASE>/manifest.json`
- `snapshots/<PHASE>/report.md`

## رفتار مهم
در صورت موفقیت gateها، runner:
1. artifact snapshot را ایجاد می کند.
2. همان snapshot را commit می کند.
3. tag با الگوی `phase-<PHASE>-<timestamp>` می سازد.
4. به صورت پیش فرض push انجام نمی دهد.

## Push اختیاری
```bash
PHASE_RUNNER_PUSH=1 ./tools/phase-runner/run.sh P0
```

## اجرای ایمن
برای جلوگیری از تداخل:
- runner را فقط روی branch اختصاصی اجرا کنید.
- قبل از اجرا `git status` باید clean باشد.
- برای push از branch غیر از main استفاده شود.

## اجرای نمونه
```bash
pnpm -w phase:run P0
```
