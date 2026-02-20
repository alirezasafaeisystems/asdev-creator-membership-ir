#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PID_FILE="$ROOT_DIR/.local-run/autopilot.pid"
LOG_FILE="$ROOT_DIR/.local-run/logs/autopilot-daemon.log"

if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "autopilot-daemon: running pid=$(cat "$PID_FILE")"
else
  echo "autopilot-daemon: stopped"
fi

if [[ -f "$LOG_FILE" ]]; then
  tail -n 20 "$LOG_FILE"
fi
