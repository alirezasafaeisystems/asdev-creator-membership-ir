#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is required" >&2
  exit 1
fi

EVIDENCE_DIR="$ROOT_DIR/.codex/production-evidence/$(date -u +%Y%m%d-%H%M%S)-phase-c"
mkdir -p "$EVIDENCE_DIR"

{
  echo "# Production Phase C Evidence"
  echo
  echo "started_at: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
} > "$EVIDENCE_DIR/summary.md"

if ! curl -fsS "http://127.0.0.1:4000/health" >/dev/null 2>&1; then
  DATABASE_URL="$DATABASE_URL" pnpm -w local:stack:start | tee "$EVIDENCE_DIR/local-stack-start.log"
fi

pnpm -w security:scan | tee "$EVIDENCE_DIR/security-scan.log"
API_PORT=4071 HOST=127.0.0.1 DATABASE_URL="$DATABASE_URL" pnpm -w smoke:auth-session | tee "$EVIDENCE_DIR/smoke-auth-session.log"
API_PORT=4072 HOST=127.0.0.1 DATABASE_URL="$DATABASE_URL" pnpm -w smoke:rbac-admin | tee "$EVIDENCE_DIR/smoke-rbac.log"

curl -si "http://127.0.0.1:4000/health" > "$EVIDENCE_DIR/health-headers.txt"
for header in "X-Content-Type-Options" "X-Frame-Options" "Referrer-Policy" "Permissions-Policy"; do
  if ! rg -qi "^${header}:" "$EVIDENCE_DIR/health-headers.txt"; then
    echo "ERROR: missing security header $header" >&2
    exit 1
  fi
done

{
  echo
  echo "completed_at: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  echo "checks:"
  echo "- security scan passed"
  echo "- auth session smoke passed"
  echo "- RBAC smoke passed"
  echo "- security headers verified"
} >> "$EVIDENCE_DIR/summary.md"

echo "PRODUCTION_PHASE_C_OK evidence=$EVIDENCE_DIR"
