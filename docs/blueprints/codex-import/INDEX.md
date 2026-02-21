# Codex Import Index

Source: manual import in repository root on 2026-02-21.

Imported into this folder:
- `docs/blueprints/codex-import/asdev-blueprints/README.md`
- `docs/blueprints/codex-import/asdev-blueprints/GUIDE.md`
- `docs/blueprints/codex-import/asdev-blueprints/01-guides/*`
- `docs/blueprints/codex-import/asdev-blueprints/02-membership/*`
- `docs/blueprints/codex-import/asdev-blueprints/03-shared/*`

Discovery notes:
- The imported pack uses `01-guides/` (not `00-guides/`).
- Membership references found in the import include `normalizeReturnUrl`, `normalizeCreatorSlug`, and schema marker `asdev.membership.ops.summary.v1`.

Usage policy in this repo:
- Imported files are reference blueprints.
- Production code must be implemented under `apps/*`, `scripts/*`, `docs/*`, and `tasks/*` with repository conventions.
