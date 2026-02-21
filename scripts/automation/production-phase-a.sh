#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is required" >&2
  exit 1
fi

if [[ -z "${PAYMENT_GATEWAY_WEBHOOK_SECRET:-}" ]]; then
  echo "ERROR: PAYMENT_GATEWAY_WEBHOOK_SECRET is required" >&2
  exit 1
fi

EVIDENCE_DIR="$ROOT_DIR/.codex/production-evidence/$(date -u +%Y%m%d-%H%M%S)-phase-a"
mkdir -p "$EVIDENCE_DIR"

{
  echo "# Production Phase A Evidence"
  echo
  echo "started_at: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  echo "database_url_set: yes"
  echo "webhook_secret_set: yes"
} > "$EVIDENCE_DIR/summary.md"

bash scripts/automation/payment-secret-rotate.sh | tee "$EVIDENCE_DIR/secret-rotate.log"
pnpm -w smoke:idpay-callback | tee "$EVIDENCE_DIR/smoke-idpay.log"
pnpm -w smoke:mock-payment | tee "$EVIDENCE_DIR/smoke-mock.log"
pnpm -w jobs:enqueue:ops | tee "$EVIDENCE_DIR/jobs-enqueue.log"
if command -v timeout >/dev/null 2>&1; then
  timeout 8s pnpm -C apps/api worker:start > "$EVIDENCE_DIR/worker-run.log" 2>&1 || true
else
  pnpm -C apps/api worker:start > "$EVIDENCE_DIR/worker-run.log" 2>&1 &
  worker_pid=$!
  sleep 5
  kill "$worker_pid" >/dev/null 2>&1 || true
fi

{
  echo
  echo "completed_at: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  echo "checks:"
  echo "- idpay callback smoke: passed"
  echo "- mock callback smoke: passed"
  echo "- jobs enqueue: passed"
  echo "- secret rotation artifact: generated"
} >> "$EVIDENCE_DIR/summary.md"

echo "PRODUCTION_PHASE_A_OK evidence=$EVIDENCE_DIR"
