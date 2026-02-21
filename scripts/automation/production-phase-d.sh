#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is required" >&2
  exit 1
fi

EVIDENCE_DIR="$ROOT_DIR/.codex/production-evidence/$(date -u +%Y%m%d-%H%M%S)-phase-d"
mkdir -p "$EVIDENCE_DIR"

{
  echo "# Production Phase D Evidence"
  echo
  echo "started_at: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
} > "$EVIDENCE_DIR/summary.md"

pnpm -w runtime:health:report | tee "$EVIDENCE_DIR/runtime-health.log"
pnpm -w contracts:check | tee "$EVIDENCE_DIR/contracts.log"
pnpm -w perf:check | tee "$EVIDENCE_DIR/perf.log"
API_PORT=4062 HOST=127.0.0.1 DATABASE_URL="$DATABASE_URL" pnpm -w smoke:rbac-admin | tee "$EVIDENCE_DIR/smoke-rbac.log"

cp -f ".local-run/runtime/health.json" "$EVIDENCE_DIR/health.json" || true
cp -f ".local-run/runtime/health.md" "$EVIDENCE_DIR/health.md" || true
cp -f "ops/dashboards/development-dashboard.html" "$EVIDENCE_DIR/development-dashboard.html" || true
cp -f "ops/dashboards/deploy-dashboard.html" "$EVIDENCE_DIR/deploy-dashboard.html" || true

{
  echo
  echo "completed_at: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  echo "checks:"
  echo "- runtime health report generated"
  echo "- contracts/perf checks passed"
  echo "- RBAC smoke passed"
  echo "- dashboard artifacts copied"
} >> "$EVIDENCE_DIR/summary.md"

echo "PRODUCTION_PHASE_D_OK evidence=$EVIDENCE_DIR"
