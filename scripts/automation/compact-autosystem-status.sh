#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "== compact autosystem =="
[[ -f .local-run/roadmap-auto/state.json ]] && cat .local-run/roadmap-auto/state.json || echo "roadmap state: missing"

echo
bash scripts/automation/autopilot-daemon-status.sh || true

echo
if [[ -f .local-run/worker.pid ]] && kill -0 "$(cat .local-run/worker.pid)" 2>/dev/null; then
  echo "worker: running pid=$(cat .local-run/worker.pid)"
else
  echo "worker: stopped"
fi

echo
bash scripts/automation/worker-daemon-status.sh || true
