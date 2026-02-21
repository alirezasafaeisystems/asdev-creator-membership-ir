#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RUN_DIR="$ROOT_DIR/.local-run"
PID_FILE="$RUN_DIR/worker-daemon.pid"
mkdir -p "$RUN_DIR"

if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "WORKER_DAEMON_ALREADY_RUNNING pid=$(cat "$PID_FILE")"
  exit 0
fi

rm -f "$PID_FILE"
if command -v setsid >/dev/null 2>&1; then
  setsid -f bash "$ROOT_DIR/scripts/automation/worker-daemon.sh" >/dev/null 2>&1
else
  nohup bash "$ROOT_DIR/scripts/automation/worker-daemon.sh" >/dev/null 2>&1 &
fi

sleep 1
pgrep -f "scripts/automation/worker-daemon.sh" | head -n1 > "$PID_FILE" || true

if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "WORKER_DAEMON_STARTED pid=$(cat "$PID_FILE")"
else
  echo "ERROR: failed to start worker daemon" >&2
  exit 1
fi
