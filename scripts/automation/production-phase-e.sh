#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is required" >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: psql is required" >&2
  exit 1
fi

EVIDENCE_DIR="$ROOT_DIR/.codex/production-evidence/$(date -u +%Y%m%d-%H%M%S)-phase-e"
mkdir -p "$EVIDENCE_DIR"

marker="release-rollback-$(date +%s)-$RANDOM"

{
  echo "# Production Phase E Evidence"
  echo
  echo "started_at: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  echo "marker: $marker"
} > "$EVIDENCE_DIR/summary.md"

pnpm -w build | tee "$EVIDENCE_DIR/build.log"
bash scripts/automation/db-backup.sh | tee "$EVIDENCE_DIR/backup.log"
backup_file="$(sed -n 's/^DB_BACKUP_OK file=//p' "$EVIDENCE_DIR/backup.log" | tail -n1)"
if [[ -z "$backup_file" || ! -f "$backup_file" ]]; then
  echo "ERROR: backup file missing" >&2
  exit 1
fi

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "INSERT INTO audit_events (action, entity_type, payload, trace_id) VALUES ('release.rollback.marker', 'release', jsonb_build_object('marker', '$marker'), 'release-drill');" > "$EVIDENCE_DIR/insert-marker.log"
pre_count="$(psql "$DATABASE_URL" -At -c "SELECT COUNT(*) FROM audit_events WHERE action='release.rollback.marker' AND payload->>'marker'='$marker';")"
echo "marker_before_restore=$pre_count" | tee "$EVIDENCE_DIR/verify-before.log"
if [[ "$pre_count" -lt 1 ]]; then
  echo "ERROR: marker insert failed" >&2
  exit 1
fi

BACKUP_FILE="$backup_file" bash scripts/automation/db-restore.sh | tee "$EVIDENCE_DIR/restore.log"
post_count="$(psql "$DATABASE_URL" -At -c "SELECT COUNT(*) FROM audit_events WHERE action='release.rollback.marker' AND payload->>'marker'='$marker';")"
echo "marker_after_restore=$post_count" | tee "$EVIDENCE_DIR/verify-after.log"
if [[ "$post_count" != "0" ]]; then
  echo "ERROR: rollback verification failed" >&2
  exit 1
fi

pnpm -w smoke:all | tee "$EVIDENCE_DIR/smoke-all.log"

{
  echo
  echo "completed_at: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  echo "checks:"
  echo "- build passed"
  echo "- backup created"
  echo "- rollback restore verified with marker"
  echo "- smoke-all passed after restore"
} >> "$EVIDENCE_DIR/summary.md"

echo "PRODUCTION_PHASE_E_OK evidence=$EVIDENCE_DIR"
