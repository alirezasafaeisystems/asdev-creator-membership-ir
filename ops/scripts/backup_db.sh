#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="${1:-./backups}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-pli}"
DB_USER="${DB_USER:-pli}"

if [[ -z "${PGPASSWORD:-}" ]]; then
  echo "ERROR: PGPASSWORD is required"
  exit 1
fi

mkdir -p "$OUT_DIR"
TS="$(date -u +"%Y%m%dT%H%M%SZ")"
OUT_FILE="${OUT_DIR}/db_${DB_NAME}_${TS}.dump"

pg_dump \
  --format=custom \
  --no-owner \
  --no-privileges \
  --host "$DB_HOST" \
  --port "$DB_PORT" \
  --username "$DB_USER" \
  --dbname "$DB_NAME" \
  --file "$OUT_FILE"

sha256sum "$OUT_FILE" > "${OUT_FILE}.sha256"

echo "BACKUP_OK $OUT_FILE"
