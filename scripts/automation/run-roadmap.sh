#!/usr/bin/env bash
set -euo pipefail

RUNNER="/home/dev/Project_Me/codex-roadmap-runner/scripts/run-roadmap.sh"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PLAN_PATH="$REPO_DIR/tasks/ROADMAP_EXECPLAN.md"

mode="${1:-auto}"

if [[ ! -x "$RUNNER" ]]; then
  echo "ERROR: codex-roadmap-runner not found or not executable at: $RUNNER" >&2
  exit 1
fi

if [[ ! -f "$PLAN_PATH" ]]; then
  echo "ERROR: plan file missing: $PLAN_PATH" >&2
  exit 1
fi

case "$mode" in
  auto|semi) ;;
  *) echo "Usage: $0 [auto|semi]" >&2; exit 2 ;;
esac

"$RUNNER" \
  --repo "$REPO_DIR" \
  --mode "$mode" \
  --plan "$PLAN_PATH" \
  --max-cycles 2 \
  --timeout-seconds 1800

