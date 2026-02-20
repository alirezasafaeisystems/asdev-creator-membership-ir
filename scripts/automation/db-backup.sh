#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is required" >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "ERROR: pg_dump is not installed" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT_DIR="${BACKUP_DIR:-$ROOT_DIR/.local-run/backups}"
mkdir -p "$OUT_DIR"

TS="$(date -u +%Y%m%d-%H%M%S)"
OUT_FILE="$OUT_DIR/db-backup-$TS.dump"

pg_dump --format=custom --file="$OUT_FILE" "$DATABASE_URL"

echo "DB_BACKUP_OK file=$OUT_FILE"
