# CODEX_CLI_PROMPT — آماده برای اجرای Codex CLI

> هدف: Codex ابتدا «مستندات» را بخواند، سپس پروژه را با همان سیاست‌ها **اعمال** کند:
> - Local‑First (بدون وابستگی خارجی در runtime)
> - Modular Monolith
> - استانداردهای امنیت/پرداخت/اشتراک
> - UI مشابه رویکرد persiantoolbox (مینیمال، سریع، قابل اتکا)

## Prompt (paste into Codex CLI)

You are working inside the repository: `asdev-creator-membership-ir`.

Goal: apply the repository documentation and the new analysis docs to the codebase, ensuring:
- Local-First runtime: no external runtime requests, no CDN fonts/scripts, self-hosted assets.
- Modular monolith architecture (clear domain modules).
- Production-grade subscription lifecycle + payment gateway adapter for Iran.
- Strong security defaults (RBAC, audit logs, rate limits, idempotency).
- Frontend UI/UX aligned with the "asdev-persiantoolbox" style: minimal, fast, accessible, Persian-friendly.

Instructions:
1) Read and summarize these docs first, and list any gaps/contradictions:
   - docs/PRD.md
   - docs/ARCHITECTURE/*
   - docs/FRONTEND/*
   - docs/POLICIES/*
   - docs/DEPLOYMENT/*
   - docs/ANALYSIS/*
2) Produce an actionable implementation plan with checkboxes, grouped by phases from docs/ANALYSIS/ROADMAP.md.
3) Implement phase-by-phase, creating commits per phase (or per module) with clear messages.
4) Add/extend automated gates:
   - lint, typecheck, unit tests
   - "local-first" scan to fail CI if external runtime dependencies exist
5) Ensure docker-compose local-first environment works:
   - `pnpm install`
   - `pnpm test`
   - `pnpm build`
   - `docker compose up`
6) Output:
   - a short CHANGELOG_APPLIED.md describing what was changed
   - updated docs if assumptions change
   - commands to verify locally

Constraints:
- Do not introduce cloud vendor dependencies (AWS/GCP/Firebase/Stripe/Google Fonts/CDNs).
- Prefer self-hosted alternatives: PostgreSQL, Redis, MinIO, Nginx.
- Use environment variables for all secrets and endpoints.
- Keep code modular and testable.
