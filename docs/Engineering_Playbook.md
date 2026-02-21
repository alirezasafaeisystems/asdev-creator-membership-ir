# Engineering Playbook

## Delivery Principles
- Keep changes small, testable, reversible.
- Preserve API and data safety boundaries.
- Prefer extension over refactor when scope is MVP hardening.

## Required Gates
- `pnpm -w docs:validate`
- `pnpm -w lint`
- `pnpm -w typecheck`
- `pnpm -w local-first:scan`
- `pnpm -w test`
- `pnpm -w build`

## Evidence Discipline
- Record local evidence for significant changes.
- Update roadmap/task docs with concrete acceptance criteria.
- Keep runbooks aligned with shipped behavior.
