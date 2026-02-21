#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

export DATABASE_URL="${DATABASE_URL:-postgresql://dev@127.0.0.1:55432/pli}"
export PAYMENT_GATEWAY_WEBHOOK_SECRET="${PAYMENT_GATEWAY_WEBHOOK_SECRET:-auto-dev-webhook-secret}"

EVID_ROOT="$ROOT_DIR/.codex/production-evidence"
mkdir -p "$EVID_ROOT"

has_phase_evidence() {
  local phase_tag="$1"
  find "$EVID_ROOT" -maxdepth 1 -type d -name "*-${phase_tag}" | grep -q .
}

run_phase() {
  local phase="$1"
  local cmd="$2"
  if has_phase_evidence "$phase"; then
    echo "[PROD_AUTO] skip $phase (evidence exists)"
    return 0
  fi
  echo "[PROD_AUTO] run $phase"
  bash -lc "$cmd"
}

run_phase phase-a "pnpm -w production:phase-a"
run_phase phase-b "pnpm -w production:phase-b"
run_phase phase-c "pnpm -w production:phase-c"
run_phase phase-d "pnpm -w production:phase-d"
run_phase phase-e "pnpm -w production:phase-e"
run_phase phase-f "pnpm -w production:phase-f"
run_phase phase-g "pnpm -w production:phase-g"

pnpm -w roadmap:sync-next:production

echo "PRODUCTION_AUTO_COMPLETE_OK"
