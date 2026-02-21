#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PID_FILE="$ROOT_DIR/.local-run/worker-daemon.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "WORKER_DAEMON_NOT_RUNNING"
  exit 0
fi

PID="$(cat "$PID_FILE")"
if kill -0 "$PID" 2>/dev/null; then
  kill "$PID" >/dev/null 2>&1 || true
fi
rm -f "$PID_FILE"

echo "WORKER_DAEMON_STOPPED pid=$PID"
