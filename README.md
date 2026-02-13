# asdev-creator-membership-ir — ریشه پروژه (Local-first)

این ریپو **ریشه پروژه اجرایی** است و در عین حال **مرجع مستندات فنی** نیز هست.
هدف: ساخت یک Patreon-lite برای ایران، با تاکید بر:
- **Local-first runtime** (بدون CDN/وابستگی خارجی در اجرا)
- معماری ماژولار و قابل گسترش
- ممیزی‌پذیری (Audit-by-default) برای پرداخت/دانلود/تسویه
- تحویل مرحله‌ای (P0..P3 + RELEASE)

## شروع سریع
1) مستندات:
- `docs/INDEX.md` (نقشه کل مستندات)

2) تحویل به Codex:
- `CODEX_INSTRUCTIONS.md`
- `CODEX_FILE_PLAN.md`

3) اعتبارسنجی مستندات:
```bash
pnpm -w docs:validate
```

4) اجرای Phase Runner (پس از init git):
```bash
pnpm -w phase:run P0
```

## ساختار
- `apps/` اپلیکیشن‌ها (API/Web) — در P0 اسکلت اجرایی ایجاد می‌شود
- `modules/` ماژول‌های دامنه
- `docs/` مستندات رسمی
- `tools/` ابزارهای enforce (docs-validator/phase-runner)
- `ops/` compose/nginx/dashboards و اسکریپت‌های عملیاتی

نسخه پکیج: 2026-02-08
