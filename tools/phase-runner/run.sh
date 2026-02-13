#!/usr/bin/env bash
set -euo pipefail

PHASE_ID="${1:-}"
if [[ -z "$PHASE_ID" ]]; then
  echo "Usage: ./tools/phase-runner/run.sh <PHASE_ID>"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PHASES_JSON="$ROOT_DIR/tools/phase-runner/phases.json"
SNAP_DIR="$ROOT_DIR/snapshots/$PHASE_ID"
MANIFEST="$SNAP_DIR/manifest.json"
REPORT="$SNAP_DIR/report.md"
PUSH_ENABLED="${PHASE_RUNNER_PUSH:-0}"

cd "$ROOT_DIR"
mkdir -p "$SNAP_DIR"

phase_json="$(node - "$PHASE_ID" "$PHASES_JSON" <<'NODE'
const fs = require('fs');
const phaseId = process.argv[2];
const phasesPath = process.argv[3];
const parsed = JSON.parse(fs.readFileSync(phasesPath, 'utf8'));
const phase = (parsed.phases || []).find((p) => p.id === phaseId);
if (!phase) process.exit(2);
process.stdout.write(JSON.stringify(phase));
NODE
)"

PHASE_NAME="$(node -e "console.log(JSON.parse(process.argv[1]).name||'')" "$phase_json")"

if [[ -n "$(git status --porcelain 2>/dev/null || true)" ]]; then
  echo "ERROR: Working tree is not clean."
  exit 1
fi

GIT_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')"
GIT_COMMIT="$(git rev-parse HEAD 2>/dev/null || echo '')"
TAG="phase-${PHASE_ID}-$(date -u +"%Y%m%d-%H%M%S")"
created_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

gates="$(node -e 'const p=JSON.parse(process.argv[1]);console.log(JSON.stringify(p.gates||[]))' "$phase_json")"

node - "$gates" <<'NODE' > "$SNAP_DIR/_gate_results.json"
const { execSync } = require('child_process');
const gates = JSON.parse(process.argv[2]);
let results = [];
let overallOk = true;
for (const g of gates) {
  const start = Date.now();
  let ok = true;
  try {
    execSync(g.cmd, { stdio: 'pipe' });
  } catch {
    ok = false;
    overallOk = false;
  }
  results.push({ id: g.id, ok, cmd: g.cmd, duration_ms: Date.now() - start });
}
process.stdout.write(JSON.stringify({ overallOk, results }, null, 2));
NODE

overall_ok="$(node -e "console.log(require('./snapshots/'+process.argv[1]+'/_gate_results.json').overallOk ? 1 : 0)" "$PHASE_ID" 2>/dev/null || echo 0)"
gate_results="$(cat "$SNAP_DIR/_gate_results.json" | node -e "const s=require('fs').readFileSync(0,'utf8');console.log(JSON.stringify(JSON.parse(s).results))")"

cat > "$MANIFEST" <<JSON
{
  "phaseId": "$PHASE_ID",
  "phaseName": "$PHASE_NAME",
  "createdAt": "$created_at",
  "git": { "branch": "$GIT_BRANCH", "commit": "$GIT_COMMIT", "tag": "$TAG" },
  "gates": $gate_results,
  "artifacts": [
    { "name": "manifest", "path": "snapshots/$PHASE_ID/manifest.json" },
    { "name": "phase_report", "path": "snapshots/$PHASE_ID/report.md" }
  ]
}
JSON

cat > "$REPORT" <<MD
# گزارش فاز $PHASE_ID — $PHASE_NAME
زمان (UTC): $created_at

## Git
- branch: \`$GIT_BRANCH\`
- commit: \`$GIT_COMMIT\`
- tag: \`$TAG\`

## Gate Results
MD

node -e '
const m = require(process.argv[1]);
for (const g of m.gates) console.log(`- **${g.id}**: ${g.ok ? "OK" : "FAIL"} — \`${g.duration_ms}\` ms — \`${g.cmd}\``);
' "$MANIFEST" >> "$REPORT"

rm -f "$SNAP_DIR/_gate_results.json"

if [[ "$overall_ok" -ne 1 ]]; then
  echo "ERROR: Gates failed. Manifest/report generated; no commit/tag."
  exit 1
fi

git add "$SNAP_DIR"
git commit -m "chore(phase): complete ${PHASE_ID} snapshot"
git tag "$TAG"

if [[ "$PUSH_ENABLED" == "1" ]]; then
  if git remote get-url origin >/dev/null 2>&1; then
    git push origin "$GIT_BRANCH"
    git push origin "$TAG"
  fi
else
  echo "INFO: Push disabled. Set PHASE_RUNNER_PUSH=1 to push branch/tag."
fi

echo "DONE: $PHASE_ID"
