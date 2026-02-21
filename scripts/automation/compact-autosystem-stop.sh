#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

bash scripts/automation/autopilot-daemon-stop.sh || true
bash scripts/automation/worker-daemon-stop.sh || true

if [[ -f .local-run/worker.pid ]] && kill -0 "$(cat .local-run/worker.pid)" 2>/dev/null; then
  kill "$(cat .local-run/worker.pid)" >/dev/null 2>&1 || true
fi
rm -f .local-run/worker.pid

echo "COMPACT_AUTOSYSTEM_STOPPED"
