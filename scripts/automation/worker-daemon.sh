#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_DIR="$ROOT_DIR/.local-run/logs"
mkdir -p "$LOG_DIR"

export DATABASE_URL="${DATABASE_URL:-postgresql://dev@127.0.0.1:55432/pli}"
export PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-http://127.0.0.1:4000}"

while true; do
  echo "[WORKER_DAEMON] $(date -u +'%Y-%m-%dT%H:%M:%SZ') worker start" >> "$LOG_DIR/worker-daemon.log"
  if pnpm -C "$ROOT_DIR/apps/api" build >> "$LOG_DIR/worker-daemon.log" 2>&1 && \
     pnpm -C "$ROOT_DIR/apps/api" worker:start >> "$LOG_DIR/worker-daemon.log" 2>&1; then
    echo "[WORKER_DAEMON] worker exited normally; restarting" >> "$LOG_DIR/worker-daemon.log"
  else
    echo "[WORKER_DAEMON] worker crashed; restarting" >> "$LOG_DIR/worker-daemon.log"
  fi
  sleep 2
done
