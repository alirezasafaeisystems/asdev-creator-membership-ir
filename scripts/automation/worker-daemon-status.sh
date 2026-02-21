#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PID_FILE="$ROOT_DIR/.local-run/worker-daemon.pid"
LOG_FILE="$ROOT_DIR/.local-run/logs/worker-daemon.log"

if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "worker-daemon: running pid=$(cat "$PID_FILE")"
else
  echo "worker-daemon: stopped"
fi

if [[ -f "$LOG_FILE" ]]; then
  tail -n 20 "$LOG_FILE"
fi
