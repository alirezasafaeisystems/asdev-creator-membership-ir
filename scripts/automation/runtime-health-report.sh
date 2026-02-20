#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT_DIR="$ROOT_DIR/.local-run/runtime"
OUT_JSON="$OUT_DIR/health.json"
OUT_MD="$OUT_DIR/health.md"
mkdir -p "$OUT_DIR"

now_utc="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
api_ok=false
proxy_ok=false
creators_count=0

if curl -fsS "http://127.0.0.1:4000/api/v1/health/db" >/dev/null 2>&1; then
  api_ok=true
fi

if curl -fsS "http://127.0.0.1:8080/health" >/dev/null 2>&1; then
  proxy_ok=true
fi

if creators_json="$(curl -fsS "http://127.0.0.1:4000/api/v1/creators?limit=1" 2>/dev/null)"; then
  creators_count="$(jq -r '.items | length' <<<"$creators_json" 2>/dev/null || echo 0)"
fi

stack_status="$(pnpm -w local:stack:status 2>/dev/null || true)"
proxy_status="$(pnpm -w local:proxy:status 2>/dev/null || true)"

overall_ok=false
if [[ "$api_ok" == "true" && "$proxy_ok" == "true" ]]; then
  overall_ok=true
fi

cat > "$OUT_JSON" <<JSON
{
  "generatedAt": "$now_utc",
  "overallOk": $overall_ok,
  "apiDbHealth": $api_ok,
  "proxyHealth": $proxy_ok,
  "creatorsCount": $creators_count,
  "stackStatus": $(jq -Rs . <<<"$stack_status"),
  "proxyStatus": $(jq -Rs . <<<"$proxy_status")
}
JSON

cat > "$OUT_MD" <<MD
# Runtime Health

Generated: $now_utc

- overallOk: $overall_ok
- apiDbHealth: $api_ok
- proxyHealth: $proxy_ok
- creatorsCount: $creators_count

## Stack Status
\`\`\`
$stack_status
\`\`\`

## Proxy Status
\`\`\`
$proxy_status
\`\`\`
MD

echo "RUNTIME_HEALTH_OK json=$OUT_JSON md=$OUT_MD overall=$overall_ok creators=$creators_count"
