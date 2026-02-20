#!/usr/bin/env bash
set -euo pipefail

if ! command -v nginx >/dev/null 2>&1; then
  echo "ERROR: nginx not found on host. Install nginx for local reverse proxy runtime." >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RUN_DIR="$ROOT_DIR/.local-run/nginx"
CONF_PATH="$RUN_DIR/nginx.conf"
PID_PATH="$RUN_DIR/nginx.pid"
mkdir -p "$RUN_DIR/logs" "$RUN_DIR/temp" "$RUN_DIR/html"

PROXY_PORT="${PROXY_PORT:-8080}"
WEB_UPSTREAM="${WEB_UPSTREAM:-127.0.0.1:3000}"
API_UPSTREAM="${API_UPSTREAM:-127.0.0.1:4000}"

if [[ -f "$PID_PATH" ]] && kill -0 "$(cat "$PID_PATH")" 2>/dev/null; then
  echo "INFO: local proxy already running pid=$(cat "$PID_PATH")"
  exit 0
fi

cat > "$CONF_PATH" <<CONF
pid $PID_PATH;
worker_processes 1;

events { worker_connections 1024; }

http {
  access_log $RUN_DIR/logs/access.log;
  error_log $RUN_DIR/logs/error.log warn;
  sendfile on;
  server {
    listen ${PROXY_PORT};
    server_name 127.0.0.1 localhost;

    location = /health {
      add_header Content-Type application/json;
      return 200 '{"ok":true,"service":"nginx-host"}';
    }

    location /api/ {
      proxy_pass http://${API_UPSTREAM};
      proxy_http_version 1.1;
      proxy_set_header Host \$host;
      proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
      proxy_pass http://${WEB_UPSTREAM};
      proxy_http_version 1.1;
      proxy_set_header Host \$host;
      proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto \$scheme;
      proxy_set_header Upgrade \$http_upgrade;
      proxy_set_header Connection "upgrade";
    }
  }
}
CONF

nginx -p "$RUN_DIR" -c "$CONF_PATH"

if [[ -f "$PID_PATH" ]] && kill -0 "$(cat "$PID_PATH")" 2>/dev/null; then
  echo "LOCAL_PROXY_STARTED port=$PROXY_PORT pid=$(cat "$PID_PATH") conf=$CONF_PATH"
else
  echo "ERROR: failed to start local proxy" >&2
  exit 1
fi
