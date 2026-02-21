#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is required" >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: psql is required for DR drill" >&2
  exit 1
fi

EVIDENCE_DIR="$ROOT_DIR/.codex/production-evidence/$(date -u +%Y%m%d-%H%M%S)-phase-b"
mkdir -p "$EVIDENCE_DIR"

marker="dr-drill-$(date +%s)-$RANDOM"

{
  echo "# Production Phase B Evidence"
  echo
  echo "started_at: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  echo "marker: $marker"
} > "$EVIDENCE_DIR/summary.md"

bash scripts/automation/db-backup.sh | tee "$EVIDENCE_DIR/backup.log"
backup_file="$(sed -n 's/^DB_BACKUP_OK file=//p' "$EVIDENCE_DIR/backup.log" | tail -n1)"
if [[ -z "$backup_file" || ! -f "$backup_file" ]]; then
  echo "ERROR: backup file not found after backup step" >&2
  exit 1
fi

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "INSERT INTO audit_events (action, entity_type, payload, trace_id) VALUES ('dr.drill.marker', 'drill', jsonb_build_object('marker', '$marker'), 'dr-drill');" > "$EVIDENCE_DIR/insert-marker.log"
before_count="$(psql "$DATABASE_URL" -At -c "SELECT COUNT(*) FROM audit_events WHERE action='dr.drill.marker' AND payload->>'marker'='$marker';")"
echo "marker_before_restore=$before_count" | tee "$EVIDENCE_DIR/verify-before.log"
if [[ "$before_count" -lt 1 ]]; then
  echo "ERROR: marker not inserted correctly" >&2
  exit 1
fi

BACKUP_FILE="$backup_file" bash scripts/automation/db-restore.sh | tee "$EVIDENCE_DIR/restore.log"

after_count="$(psql "$DATABASE_URL" -At -c "SELECT COUNT(*) FROM audit_events WHERE action='dr.drill.marker' AND payload->>'marker'='$marker';")"
echo "marker_after_restore=$after_count" | tee "$EVIDENCE_DIR/verify-after.log"
if [[ "$after_count" != "0" ]]; then
  echo "ERROR: restore verification failed, marker still present" >&2
  exit 1
fi

{
  echo
  echo "completed_at: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  echo "checks:"
  echo "- backup created: $backup_file"
  echo "- restore completed from backup"
  echo "- marker verification passed (pre>0, post=0)"
} >> "$EVIDENCE_DIR/summary.md"

echo "PRODUCTION_PHASE_B_OK evidence=$EVIDENCE_DIR"
