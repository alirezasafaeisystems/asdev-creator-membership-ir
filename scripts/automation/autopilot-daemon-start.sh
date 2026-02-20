#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RUN_DIR="$ROOT_DIR/.local-run"
LOG_DIR="$RUN_DIR/logs"
PID_FILE="$RUN_DIR/autopilot.pid"
mkdir -p "$LOG_DIR"

if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "AUTOPILOT_DAEMON_ALREADY_RUNNING pid=$(cat "$PID_FILE")"
  exit 0
fi

rm -f "$PID_FILE"
if command -v setsid >/dev/null 2>&1; then
  AUTOPILOT_INTERVAL_SEC="${AUTOPILOT_INTERVAL_SEC:-900}" \
    setsid -f bash "$ROOT_DIR/scripts/automation/autopilot-daemon.sh" >/dev/null 2>&1
else
  AUTOPILOT_INTERVAL_SEC="${AUTOPILOT_INTERVAL_SEC:-900}" \
    nohup bash "$ROOT_DIR/scripts/automation/autopilot-daemon.sh" >/dev/null 2>&1 &
fi

sleep 1
pgrep -f "scripts/automation/autopilot-daemon.sh" | head -n1 > "$PID_FILE" || true

if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "AUTOPILOT_DAEMON_STARTED pid=$(cat "$PID_FILE") interval_sec=${AUTOPILOT_INTERVAL_SEC:-900}"
else
  echo "ERROR: failed to start autopilot daemon" >&2
  exit 1
fi
