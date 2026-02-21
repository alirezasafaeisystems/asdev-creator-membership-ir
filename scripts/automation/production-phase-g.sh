#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is required" >&2
  exit 1
fi

EVIDENCE_DIR="$ROOT_DIR/.codex/production-evidence/$(date -u +%Y%m%d-%H%M%S)-phase-g"
mkdir -p "$EVIDENCE_DIR"

{
  echo "# Production Phase G Evidence"
  echo
  echo "started_at: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
} > "$EVIDENCE_DIR/summary.md"

pnpm -w docs:validate | tee "$EVIDENCE_DIR/docs-validate.log"
pnpm -w local-first:scan | tee "$EVIDENCE_DIR/local-first.log"
pnpm -w contracts:check | tee "$EVIDENCE_DIR/contracts.log"
pnpm -w roadmap:sync-next | tee "$EVIDENCE_DIR/roadmap-sync-next.log"
pnpm -w roadmap:sync-next:production | tee "$EVIDENCE_DIR/roadmap-sync-next-production.log"
pnpm -w evidence:record:gates | tee "$EVIDENCE_DIR/evidence-gates.log"

{
  echo
  echo "completed_at: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  echo "checks:"
  echo "- docs/local-first/contracts gates passed"
  echo "- roadmap task boards synced"
  echo "- local evidence refreshed"
} >> "$EVIDENCE_DIR/summary.md"

echo "PRODUCTION_PHASE_G_OK evidence=$EVIDENCE_DIR"
