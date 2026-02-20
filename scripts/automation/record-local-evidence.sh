#!/usr/bin/env bash
set -u

MODE="${1:-all}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TS="$(date -u +"%Y%m%d-%H%M%S")"
OUT_DIR="$ROOT_DIR/.codex/local-evidence/$TS"
mkdir -p "$OUT_DIR"

declare -a CMDS=()

case "$MODE" in
  gates)
    CMDS=(
      "pnpm -w roadmap:sync-next"
      "pnpm -w docs:validate"
      "pnpm -w lint"
      "pnpm -w typecheck"
      "pnpm -w local-first:scan"
      "pnpm -w test"
      "pnpm -w build"
      "pnpm -w contracts:check"
      "pnpm -w perf:check"
      "pnpm -w test:integration"
      "pnpm -w test:e2e"
    )
    ;;
  smoke)
    CMDS=(
      "pnpm -w smoke:all"
    )
    ;;
  all)
    CMDS=(
      "pnpm -w roadmap:sync-next"
      "pnpm -w docs:validate"
      "pnpm -w lint"
      "pnpm -w typecheck"
      "pnpm -w local-first:scan"
      "pnpm -w test"
      "pnpm -w build"
      "pnpm -w contracts:check"
      "pnpm -w perf:check"
      "pnpm -w test:integration"
      "pnpm -w test:e2e"
      "pnpm -w smoke:all"
    )
    ;;
  *)
    echo "Usage: $0 [gates|smoke|all]" >&2
    exit 2
    ;;
esac

RESULTS_NDJSON="$OUT_DIR/results.ndjson"
touch "$RESULTS_NDJSON"

overall_ok=1
index=0
for cmd in "${CMDS[@]}"; do
  index=$((index + 1))
  log_file="$OUT_DIR/cmd-${index}.log"
  start_ms="$(date +%s%3N)"
  if bash -lc "cd \"$ROOT_DIR\" && $cmd" >"$log_file" 2>&1; then
    status=0
    ok=true
  else
    status=$?
    ok=false
    overall_ok=0
  fi
  end_ms="$(date +%s%3N)"
  duration_ms=$((end_ms - start_ms))

  node -e '
    const fs = require("fs");
    const out = process.argv[1];
    const row = {
      cmd: process.argv[2],
      ok: process.argv[3] === "true",
      status: Number(process.argv[4]),
      durationMs: Number(process.argv[5]),
      log: process.argv[6]
    };
    fs.appendFileSync(out, JSON.stringify(row) + "\n");
  ' "$RESULTS_NDJSON" "$cmd" "$ok" "$status" "$duration_ms" "$(basename "$log_file")"
done

node -e '
  const fs = require("fs");
  const out = process.argv[1];
  const nd = process.argv[2];
  const mode = process.argv[3];
  const ts = process.argv[4];
  const lines = fs.readFileSync(nd, "utf8").trim().split("\n").filter(Boolean);
  const items = lines.map((x) => JSON.parse(x));
  const payload = {
    generatedAt: new Date().toISOString(),
    mode,
    runId: ts,
    overallOk: items.every((x) => x.ok),
    items
  };
  fs.writeFileSync(out, JSON.stringify(payload, null, 2));
  const md = [];
  md.push(`# Local Evidence ${ts}`);
  md.push(`mode: \`${mode}\``);
  md.push(`overall: ${payload.overallOk ? "OK" : "FAIL"}`);
  md.push("");
  for (const i of items) md.push(`- ${i.ok ? "[OK]" : "[FAIL]"} \`${i.cmd}\` (${i.durationMs}ms)`);
  fs.writeFileSync(out.replace(/\.json$/, ".md"), md.join("\n") + "\n");
' "$OUT_DIR/result.json" "$RESULTS_NDJSON" "$MODE" "$TS"

cp "$OUT_DIR/result.json" "$ROOT_DIR/.codex/local-evidence/latest.json"
cp "$OUT_DIR/result.md" "$ROOT_DIR/.codex/local-evidence/latest.md"

echo "LOCAL_EVIDENCE_WRITTEN $OUT_DIR"
if [[ "$overall_ok" -ne 1 ]]; then
  exit 1
fi
