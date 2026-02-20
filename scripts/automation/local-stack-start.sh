#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is required." >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RUN_DIR="$ROOT_DIR/.local-run"
LOG_DIR="$RUN_DIR/logs"
mkdir -p "$LOG_DIR"

API_PORT="${API_PORT:-4000}"
WEB_PORT="${WEB_PORT:-3000}"
HOST="${HOST:-127.0.0.1}"

if [[ -f "$RUN_DIR/api.pid" ]] && kill -0 "$(cat "$RUN_DIR/api.pid")" 2>/dev/null; then
  echo "INFO: api already running pid=$(cat "$RUN_DIR/api.pid")"
else
  rm -f "$RUN_DIR/api.pid"
  (
    cd "$ROOT_DIR"
    if command -v setsid >/dev/null 2>&1; then
      env HOST="$HOST" PORT="$API_PORT" PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-http://$HOST:$API_PORT}" \
        setsid -f pnpm -C apps/api dev >"$LOG_DIR/api.log" 2>&1
    else
      HOST="$HOST" PORT="$API_PORT" PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-http://$HOST:$API_PORT}" \
        nohup pnpm -C apps/api dev >"$LOG_DIR/api.log" 2>&1 &
    fi
  )
  sleep 1
  pgrep -f "pnpm -C apps/api dev" | head -n1 > "$RUN_DIR/api.pid" || true
fi

if [[ -f "$RUN_DIR/web.pid" ]] && kill -0 "$(cat "$RUN_DIR/web.pid")" 2>/dev/null; then
  echo "INFO: web already running pid=$(cat "$RUN_DIR/web.pid")"
else
  rm -f "$RUN_DIR/web.pid"
  (
    cd "$ROOT_DIR"
    if command -v setsid >/dev/null 2>&1; then
      env HOST="$HOST" PORT="$WEB_PORT" \
        setsid -f pnpm -C apps/web dev --hostname "$HOST" --port "$WEB_PORT" >"$LOG_DIR/web.log" 2>&1
    else
      HOST="$HOST" PORT="$WEB_PORT" nohup pnpm -C apps/web dev --hostname "$HOST" --port "$WEB_PORT" >"$LOG_DIR/web.log" 2>&1 &
    fi
  )
  sleep 1
  pgrep -f "pnpm -C apps/web dev --hostname $HOST --port $WEB_PORT" | head -n1 > "$RUN_DIR/web.pid" || true
fi

echo "LOCAL_STACK_STARTED api_port=$API_PORT web_port=$WEB_PORT run_dir=$RUN_DIR"
