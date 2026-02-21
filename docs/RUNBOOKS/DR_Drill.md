# DR Drill Runbook

## Scope
Execute Production Phase B (Data Safety and DR) with a real backup/restore verification loop.

## Required Env
- `DATABASE_URL`
- tools installed: `pg_dump`, `pg_restore`, `psql`

## Execution
1. Run DR drill automation:
   - `DATABASE_URL=... pnpm -w production:phase-b`

## What the Script Verifies
1. Creates DB backup.
2. Inserts a unique DR marker event.
3. Confirms marker exists before restore.
4. Restores from backup.
5. Confirms marker is gone after restore.

## Evidence Output
- `.codex/production-evidence/<timestamp>-phase-b/summary.md`
- `backup.log`, `restore.log`, `verify-before.log`, `verify-after.log`

## Acceptance
- Backup and restore complete successfully.
- Marker check is `pre > 0` and `post = 0`.
