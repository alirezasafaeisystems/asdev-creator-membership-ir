# Codex Repository Guidance

## Runtime Rules
- Keep changes small, testable, and reversible.
- Run the repository's lint/test/build checks before finalizing.
- Avoid breaking API, schema, or security boundaries without explicit review.

## Codex Bootstrap Defaults
- Preferred profiles: `deep-review` for hard tasks, `fast-fix` for quick/small changes.
- Maintain `.codex/snapshots/<timestamp>/` with `status`, `diff`, `branch`, `last5`, `summary.md`, `cmd.log`, and `report.md`.
- Repository skills live in `.agents/skills` and are exposed at `.codex/skills`.
