#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

mkdir -p .local-run/logs

# Compact autopilot profile.
export AUTOPILOT_INTERVAL_SEC="${AUTOPILOT_INTERVAL_SEC:-300}"
export AUTOPILOT_ROADMAP_RUNNER="${AUTOPILOT_ROADMAP_RUNNER:-1}"
export AUTOPILOT_ROADMAP_MODE="${AUTOPILOT_ROADMAP_MODE:-semi}"
export AUTOPILOT_ROADMAP_COOLDOWN_SEC="${AUTOPILOT_ROADMAP_COOLDOWN_SEC:-1800}"

bash scripts/automation/setup-auto-roles-skills.sh
bash scripts/automation/roadmap-auto-executor.sh > .local-run/logs/roadmap-auto-executor.log 2>&1 || true
bash scripts/automation/worker-daemon-start.sh
bash scripts/automation/autopilot-daemon-start.sh

echo "COMPACT_AUTOSYSTEM_STARTED interval=${AUTOPILOT_INTERVAL_SEC}s runner=${AUTOPILOT_ROADMAP_RUNNER}"
