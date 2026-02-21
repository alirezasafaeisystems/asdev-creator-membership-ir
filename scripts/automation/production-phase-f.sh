#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

EVIDENCE_DIR="$ROOT_DIR/.codex/production-evidence/$(date -u +%Y%m%d-%H%M%S)-phase-f"
mkdir -p "$EVIDENCE_DIR"

{
  echo "# Production Phase F Evidence"
  echo
  echo "started_at: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
} > "$EVIDENCE_DIR/summary.md"

pnpm -w perf:check | tee "$EVIDENCE_DIR/perf.log"
pnpm -w build | tee "$EVIDENCE_DIR/build.log"
pnpm -w test:regression | tee "$EVIDENCE_DIR/regression.log"

{
  echo
  echo "completed_at: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  echo "checks:"
  echo "- perf budget check passed"
  echo "- release build passed"
  echo "- regression suite passed"
} >> "$EVIDENCE_DIR/summary.md"

echo "PRODUCTION_PHASE_F_OK evidence=$EVIDENCE_DIR"
