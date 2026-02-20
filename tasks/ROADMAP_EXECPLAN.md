# ExecPlan — Production Phased Execution (No Timeline)

مرجع اصلی:
- `docs/ROADMAP_PRODUCTION_PHASED.md`
- `docs/ROADMAP_PHASED.md`

## اصول اجرا
- اجرای فازها خروجی‌محور است، نه تاریخ‌محور.
- هر فاز فقط با Evidence واقعی بسته می‌شود.
- تغییرات باید کوچک، تست‌پذیر و rollback-safe باشند.

## Baseline (Current Verification)
- [x] لوکال استک کامل (`run:local:full`) پایدار است
- [x] اتوپایلوت loop/daemon فعال است
- [x] gates پایه و evidence ثبت می‌شوند

## Production Phases Checklist
- [ ] Production Phase A: Real Payment Go-Live
- [ ] Production Phase B: Data Safety and DR
- [ ] Production Phase C: Security Hardening
- [ ] Production Phase D: Observability and SRE
- [ ] Production Phase E: Release Engineering
- [ ] Production Phase F: Performance and Cost Efficiency
- [ ] Production Phase G: Compliance and Operational Governance

## Required Gates Before Closing Any Production Phase
- [ ] `pnpm -w docs:validate`
- [ ] `pnpm -w lint`
- [ ] `pnpm -w typecheck`
- [ ] `pnpm -w local-first:scan`
- [ ] `pnpm -w test`
- [ ] `pnpm -w build`
- [ ] `pnpm -w contracts:check`
- [ ] `pnpm -w perf:check`
- [ ] `pnpm -w smoke:all`
- [ ] `pnpm -w evidence:record`

## Evidence
- [ ] `.codex/local-evidence/latest.json` و گزارش‌ها به‌روز شوند
- [ ] خروجی `docs/RUNTIME/LOCAL_STATUS.md` و `.local-run/runtime/health.json` به‌روز شوند
- [ ] summary اجرای runner در `.codex/roadmap-runs/<timestamp>/summary.md` ثبت شود
