#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

log() { printf '%s %s\n' "[AUTOPILOT]" "$*"; }

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ERROR: missing command: $1" >&2
    exit 1
  fi
}

require_cmd pnpm
require_cmd curl
require_cmd jq

ROADMAP_RUNNER_ENABLED="${AUTOPILOT_ROADMAP_RUNNER:-0}"
ROADMAP_RUNNER_MODE="${AUTOPILOT_ROADMAP_MODE:-semi}"
ROADMAP_RUNNER_COOLDOWN_SEC="${AUTOPILOT_ROADMAP_COOLDOWN_SEC:-21600}"
ROADMAP_LAST_RUN_FILE="$ROOT_DIR/.local-run/roadmap-runner.last"

run_roadmap_runner_if_due() {
  if [[ "$ROADMAP_RUNNER_ENABLED" != "1" ]]; then
    return 0
  fi

  local now last delta
  now="$(date +%s)"
  last=0
  if [[ -f "$ROADMAP_LAST_RUN_FILE" ]]; then
    last="$(cat "$ROADMAP_LAST_RUN_FILE" 2>/dev/null || echo 0)"
  fi
  delta=$((now - last))
  if [[ "$delta" -lt "$ROADMAP_RUNNER_COOLDOWN_SEC" ]]; then
    log "roadmap runner skipped (cooldown ${ROADMAP_RUNNER_COOLDOWN_SEC}s, elapsed ${delta}s)"
    return 0
  fi

  if [[ ! -x "$ROOT_DIR/scripts/automation/run-roadmap.sh" ]]; then
    log "roadmap runner wrapper missing; skip"
    return 0
  fi
  if ! command -v codex >/dev/null 2>&1; then
    log "codex cli missing; skip roadmap runner"
    return 0
  fi

  log "running external roadmap runner mode=$ROADMAP_RUNNER_MODE"
  if pnpm -w "roadmap:${ROADMAP_RUNNER_MODE}"; then
    # Validate latest summary to avoid false-success from upstream runner wrappers.
    local latest_summary
    latest_summary="$(ls -1dt "$ROOT_DIR"/.codex/roadmap-runs/*/summary.md 2>/dev/null | head -n1 || true)"
    if [[ -n "$latest_summary" ]] && grep -qiE 'restore command execution|re-enable shell execution|paste the contents|provide .* inline|no files modified' "$latest_summary"; then
      log "external roadmap runner reported non-actionable result; keeping as non-blocking soft-fail"
      return 0
    fi
    date +%s > "$ROADMAP_LAST_RUN_FILE"
    log "external roadmap runner completed with actionable summary"
  else
    log "external roadmap runner failed (non-blocking)"
  fi
}

log "capturing runtime health snapshot (pre)"
pnpm -w runtime:health:report || true

if ! curl -fsS "http://127.0.0.1:4000/api/v1/health/db" >/dev/null 2>&1; then
  log "runtime not healthy; running full local bootstrap"
  pnpm -w run:local:full
else
  log "runtime healthy; skipping full bootstrap"
fi

if command -v nginx >/dev/null 2>&1; then
  if ! curl -fsS "http://127.0.0.1:8080/health" >/dev/null 2>&1; then
    log "proxy not healthy; starting local proxy"
    pnpm -w local:proxy:start
  fi
fi

creators_count="$(curl -fsS "http://127.0.0.1:4000/api/v1/creators?limit=1" | jq -r '.items|length' 2>/dev/null || echo 0)"
if [[ "$creators_count" -lt 1 ]]; then
  log "no creators found; seeding local demo data"
  if curl -fsS "http://127.0.0.1:8080/health" >/dev/null 2>&1; then
    BASE_URL="http://127.0.0.1:8080" pnpm -w seed:local-demo
  else
    BASE_URL="http://127.0.0.1:4000" pnpm -w seed:local-demo
  fi
else
  log "creator data already present; skipping seed"
fi

log "running non-redundant critical gates"
pnpm -w docs:validate
pnpm -w contracts:check
pnpm -w perf:check

log "running focused regression smoke (RBAC admin)"
if [[ -n "${DATABASE_URL:-}" ]]; then
  pnpm -w smoke:rbac-admin
else
  # fallback local db from full runtime convention
  DATABASE_URL="postgresql://dev@127.0.0.1:55432/pli" pnpm -w smoke:rbac-admin
fi

log "recording evidence and syncing next board"
pnpm -w evidence:record:gates
pnpm -w roadmap:sync-next
pnpm -w roadmap:sync-next:production
pnpm -w status:local-report
pnpm -w runtime:health:report || true
run_roadmap_runner_if_due

log "autopilot loop completed"
