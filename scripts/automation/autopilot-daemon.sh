#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_DIR="$ROOT_DIR/.local-run/logs"
mkdir -p "$LOG_DIR"

INTERVAL_SEC="${AUTOPILOT_INTERVAL_SEC:-900}"
if ! [[ "$INTERVAL_SEC" =~ ^[0-9]+$ ]] || [[ "$INTERVAL_SEC" -lt 60 ]]; then
  echo "ERROR: AUTOPILOT_INTERVAL_SEC must be integer >= 60" >&2
  exit 1
fi

while true; do
  echo "[AUTOPILOT_DAEMON] $(date -u +'%Y-%m-%dT%H:%M:%SZ') cycle start" >> "$LOG_DIR/autopilot-daemon.log"
  if pnpm -w autopilot:phase-loop >> "$LOG_DIR/autopilot-daemon.log" 2>&1; then
    echo "[AUTOPILOT_DAEMON] cycle ok" >> "$LOG_DIR/autopilot-daemon.log"
  else
    echo "[AUTOPILOT_DAEMON] cycle fail" >> "$LOG_DIR/autopilot-daemon.log"
  fi
  sleep "$INTERVAL_SEC"
done
