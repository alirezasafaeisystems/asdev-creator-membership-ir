#!/usr/bin/env bash
set -euo pipefail

DUMP_FILE="${1:-}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-pli}"
DB_USER="${DB_USER:-pli}"

if [[ -z "$DUMP_FILE" ]]; then
  echo "Usage: $0 <dump-file>"
  exit 1
fi

if [[ ! -f "$DUMP_FILE" ]]; then
  echo "ERROR: dump file not found: $DUMP_FILE"
  exit 1
fi

if [[ -z "${PGPASSWORD:-}" ]]; then
  echo "ERROR: PGPASSWORD is required"
  exit 1
fi

if [[ -f "${DUMP_FILE}.sha256" ]]; then
  sha256sum -c "${DUMP_FILE}.sha256"
fi

read -r -p "This will overwrite data in ${DB_NAME}. Continue? [y/N] " CONFIRM
if [[ "${CONFIRM}" != "y" && "${CONFIRM}" != "Y" ]]; then
  echo "RESTORE_ABORTED"
  exit 1
fi

pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --host "$DB_HOST" \
  --port "$DB_PORT" \
  --username "$DB_USER" \
  --dbname "$DB_NAME" \
  "$DUMP_FILE"

echo "RESTORE_OK $DUMP_FILE"
