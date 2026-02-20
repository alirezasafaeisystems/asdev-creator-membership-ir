#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

PG_BIN="${PG_BIN:-/usr/lib/postgresql/16/bin}"
PG_ROOT="${PG_ROOT:-$ROOT_DIR/.local-run/pg-dev}"
PG_DATA="$PG_ROOT/data"
PG_LOG="$PG_ROOT/postgres.log"
PG_PORT="${PG_PORT:-55432}"
DB_NAME="${DB_NAME:-pli}"
DATABASE_URL="${DATABASE_URL:-postgresql://dev@127.0.0.1:${PG_PORT}/${DB_NAME}}"
BASE_PROXY="${BASE_PROXY:-http://127.0.0.1:8080}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ERROR: missing command: $1" >&2
    exit 1
  fi
}

require_cmd pnpm
require_cmd curl
require_cmd jq

if [[ ! -x "$PG_BIN/initdb" || ! -x "$PG_BIN/pg_ctl" || ! -x "$PG_BIN/createdb" ]]; then
  echo "ERROR: PostgreSQL binaries not found under PG_BIN=$PG_BIN" >&2
  exit 1
fi

mkdir -p "$PG_ROOT"
if [[ ! -d "$PG_DATA/base" ]]; then
  "$PG_BIN/initdb" -D "$PG_DATA" -A trust >/tmp/asdev_pg_local_full_init.log
fi
if ! "$PG_BIN/pg_ctl" -D "$PG_DATA" status >/dev/null 2>&1; then
  "$PG_BIN/pg_ctl" -D "$PG_DATA" -l "$PG_LOG" -o "-p ${PG_PORT} -k ${PG_ROOT}" start
fi
"$PG_BIN/createdb" -h 127.0.0.1 -p "$PG_PORT" "$DB_NAME" >/dev/null 2>&1 || true

pnpm -w local:stack:stop >/dev/null 2>&1 || true
pnpm -w local:proxy:stop >/dev/null 2>&1 || true

DATABASE_URL="$DATABASE_URL" pnpm -w local:stack:start
pnpm -w local:stack:status

seed_base="http://127.0.0.1:4000"
if command -v nginx >/dev/null 2>&1; then
  pnpm -w local:proxy:start
  pnpm -w local:proxy:status
  if curl -fsS "$BASE_PROXY/health" >/dev/null 2>&1; then
    seed_base="$BASE_PROXY"
  fi
fi

for _ in $(seq 1 40); do
  if curl -fsS "http://127.0.0.1:4000/api/v1/health/db" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done

BASE_URL="$seed_base" pnpm -w seed:local-demo

pnpm -w docs:validate
pnpm -w evidence:record:gates
pnpm -w roadmap:sync-next

creators_count="$(curl -fsS "$seed_base/api/v1/creators?limit=100" | jq -r '.items | length')"

cat <<SUMMARY
LOCAL_FULL_OK
- database_url: $DATABASE_URL
- seed_base: $seed_base
- creators_count: $creators_count
- api_health: http://127.0.0.1:4000/api/v1/health/db
- web_url: http://127.0.0.1:3000/creators
- proxy_url: http://127.0.0.1:8080/creators
SUMMARY
