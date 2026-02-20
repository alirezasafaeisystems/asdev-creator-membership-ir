#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RUN_DIR="$ROOT_DIR/.local-run/nginx"
CONF_PATH="$RUN_DIR/nginx.conf"
PID_PATH="$RUN_DIR/nginx.pid"

if [[ ! -f "$PID_PATH" ]]; then
  echo "INFO: local-proxy not running"
  exit 0
fi

PID="$(cat "$PID_PATH")"
if command -v nginx >/dev/null 2>&1 && [[ -f "$CONF_PATH" ]]; then
  nginx -p "$RUN_DIR" -c "$CONF_PATH" -s quit >/dev/null 2>&1 || true
fi

if kill -0 "$PID" 2>/dev/null; then
  kill "$PID" >/dev/null 2>&1 || true
fi

rm -f "$PID_PATH"
echo "LOCAL_PROXY_STOPPED pid=$PID"
