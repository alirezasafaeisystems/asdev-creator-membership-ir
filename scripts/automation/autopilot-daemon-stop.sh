#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PID_FILE="$ROOT_DIR/.local-run/autopilot.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "AUTOPILOT_DAEMON_NOT_RUNNING"
  exit 0
fi

PID="$(cat "$PID_FILE")"
if kill -0 "$PID" 2>/dev/null; then
  kill "$PID" >/dev/null 2>&1 || true
fi
rm -f "$PID_FILE"
echo "AUTOPILOT_DAEMON_STOPPED pid=$PID"
