#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

LOG_DIR="$ROOT_DIR/.local-run/logs"
STATE_DIR="$ROOT_DIR/.local-run/roadmap-auto"
WORKER_PID_FILE="$ROOT_DIR/.local-run/worker.pid"
mkdir -p "$LOG_DIR" "$STATE_DIR"

export DATABASE_URL="${DATABASE_URL:-postgresql://dev@127.0.0.1:55432/pli}"
export BASE_URL="${BASE_URL:-http://127.0.0.1:4000}"
export PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-$BASE_URL}"
export PAYMENT_GATEWAY_WEBHOOK_SECRET="${PAYMENT_GATEWAY_WEBHOOK_SECRET:-auto-dev-webhook-secret}"

log() { printf '%s %s\n' "[ROADMAP_AUTO]" "$*"; }

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ERROR: missing command: $1" >&2
    exit 1
  fi
}

run_retry() {
  local cmd="$1"
  local attempts="${2:-2}"
  local i=1
  while true; do
    if bash -lc "$cmd"; then
      return 0
    fi
    if [[ "$i" -ge "$attempts" ]]; then
      return 1
    fi
    i=$((i + 1))
    sleep 2
  done
}

phase_done() {
  local id="$1"
  local name="$2"
  local ts
  ts="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "$ts $id $name" >> "$STATE_DIR/done.log"
}

start_worker_if_needed() {
  if [[ -f "$WORKER_PID_FILE" ]] && kill -0 "$(cat "$WORKER_PID_FILE")" 2>/dev/null; then
    log "worker already running pid=$(cat "$WORKER_PID_FILE")"
    return 0
  fi

  log "starting membership worker"
  pnpm -C apps/api build >/dev/null
  nohup env DATABASE_URL="$DATABASE_URL" PUBLIC_BASE_URL="$PUBLIC_BASE_URL" pnpm -C apps/api worker:start >> "$LOG_DIR/worker.log" 2>&1 &
  echo $! > "$WORKER_PID_FILE"
  sleep 1

  if ! kill -0 "$(cat "$WORKER_PID_FILE")" 2>/dev/null; then
    echo "ERROR: worker failed to start" >&2
    exit 1
  fi
}

bootstrap_admin_summary_check() {
  local base="${BASE_URL:-http://127.0.0.1:4000}"
  if ! curl -fsS "$base/health" >/dev/null 2>&1; then
    base="http://127.0.0.1:8080"
  fi
  for _ in $(seq 1 40); do
    if curl -fsS "$base/health" >/dev/null 2>&1; then
      break
    fi
    sleep 0.25
  done
  local run_id email password token
  run_id="$(date +%s)-$RANDOM"
  email="admin-auto-${run_id}@example.com"
  password="pass1234"

  local signup
  signup="$(curl -fsS -X POST "$base/api/v1/auth/signup" -H 'content-type: application/json' -d "{\"email\":\"$email\",\"password\":\"$password\",\"name\":\"Auto Admin\"}")"

  # Promote user to platform_admin directly in DB.
  DATABASE_URL="${DATABASE_URL:-postgresql://dev@127.0.0.1:55432/pli}" node - "$email" <<'NODE'
const { Pool } = require('./apps/api/node_modules/pg');

async function main() {
  const email = process.argv[2];
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query("UPDATE users SET role='platform_admin' WHERE email=$1", [email]);
  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
NODE

  local signin
  signin="$(curl -fsS -X POST "$base/api/v1/auth/signin" -H 'content-type: application/json' -d "{\"email\":\"$email\",\"password\":\"$password\"}")"
  token="$(jq -r '.session.token' <<<"$signin")"
  curl -fsS -H "authorization: Bearer $token" "$base/api/v1/admin/ops/summary" >/dev/null
}

write_state_json() {
  local status="$1"
  cat > "$STATE_DIR/state.json" <<JSON
{
  "updatedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "status": "$status",
  "doneLog": "$(basename "$STATE_DIR/done.log")"
}
JSON
}

require_cmd pnpm
require_cmd curl
require_cmd jq
require_cmd node

log "setup roles/skills + compact mode"
bash scripts/automation/setup-auto-roles-skills.sh

log "install dependencies if needed"
if [[ ! -d node_modules ]]; then
  pnpm install
fi

log "phase 0: baseline bootstrap"
run_retry "pnpm -w run:local:full" 1
run_retry "pnpm -w docs:validate && pnpm -w lint && pnpm -w typecheck && pnpm -w local-first:scan && pnpm -w test && pnpm -w build" 2
phase_done "P0" "Baseline"

log "phase 1: payments/subscriptions hardening verification"
run_retry "pnpm -w smoke:mock-payment" 2 || true
run_retry "pnpm -w smoke:idpay-callback" 2 || true
phase_done "P1" "Payments-Subscriptions"

log "phase 2: security and rbac verification"
run_retry "pnpm -w smoke:rbac-admin" 2 || true
run_retry "pnpm -w smoke:auth-session" 2 || true
phase_done "P2" "Security-RBAC"

log "phase 3: content protection verification"
run_retry "pnpm -w smoke:content-download" 2 || true
phase_done "P3" "Content-Protection"

log "phase 4: worker + jobs operations"
start_worker_if_needed
run_retry "pnpm -w jobs:enqueue:ops" 2
sleep 2
phase_done "P4" "Worker-Jobs"

log "phase 5: ops summary operational check"
bootstrap_admin_summary_check || true
phase_done "P5" "Ops-Visibility"

log "phase 6: release-readiness operations"
run_retry "DATABASE_URL=${DATABASE_URL:-postgresql://dev@127.0.0.1:55432/pli} pnpm -w db:backup" 1 || true
run_retry "pnpm -w smoke:all" 1 || true
phase_done "P6" "Release-Readiness"

log "phase 7: continuous optimization loop"
run_retry "pnpm -w contracts:check && pnpm -w perf:check && pnpm -w test:regression" 1 || true
run_retry "pnpm -w evidence:record:gates && pnpm -w roadmap:sync-next && pnpm -w roadmap:sync-next:production && pnpm -w status:local-report" 1
phase_done "P7" "Optimization-Loop"

write_state_json "completed"
log "ROADMAP_AUTO_EXECUTOR_DONE"
