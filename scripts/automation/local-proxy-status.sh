#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RUN_DIR="$ROOT_DIR/.local-run/nginx"
PID_PATH="$RUN_DIR/nginx.pid"

if [[ -f "$PID_PATH" ]]; then
  PID="$(cat "$PID_PATH")"
  if kill -0 "$PID" 2>/dev/null; then
    echo "local-proxy: running pid=$PID"
    if command -v curl >/dev/null 2>&1; then
      HEALTH_URL="${LOCAL_PROXY_HEALTH_URL:-http://127.0.0.1:${PROXY_PORT:-8080}/health}"
      if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
        echo "local-proxy: health=ok url=$HEALTH_URL"
      else
        echo "local-proxy: health=down url=$HEALTH_URL"
      fi
    fi
    exit 0
  fi
fi

echo "local-proxy: stopped"
