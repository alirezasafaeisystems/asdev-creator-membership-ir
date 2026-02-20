#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is required for content smoke." >&2
  exit 1
fi

API_PORT="${API_PORT:-4019}"
HOST="${HOST:-127.0.0.1}"
BASE_URL="http://${HOST}:${API_PORT}"
run_id="$(date +%s)-$RANDOM"

export PORT="$API_PORT"
export PUBLIC_BASE_URL="$BASE_URL"
export PAYMENT_GATEWAY="${PAYMENT_GATEWAY:-mock}"
export CONTENT_STORAGE_ROOT="${CONTENT_STORAGE_ROOT:-/tmp/asdev-content-smoke}"

cleanup() {
  if [[ -n "${api_pid:-}" ]]; then
    kill "$api_pid" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

mkdir -p "$CONTENT_STORAGE_ROOT/run-$run_id"
echo "content-smoke-$run_id" > "$CONTENT_STORAGE_ROOT/run-$run_id/sample.txt"

pnpm -C apps/api build >/dev/null
node apps/api/dist/server.js >/dev/null 2>&1 &
api_pid="$!"

HEALTH_RETRIES="${SMOKE_HEALTH_RETRIES:-150}"
HEALTH_INTERVAL="${SMOKE_HEALTH_INTERVAL:-0.2}"
for _ in $(seq 1 "$HEALTH_RETRIES"); do
  if curl -fsS "$BASE_URL/health" >/dev/null 2>&1; then
    break
  fi
  sleep "$HEALTH_INTERVAL"
done

if ! curl -fsS "$BASE_URL/health" >/dev/null 2>&1; then
  echo "SMOKE_FAIL: API did not become healthy at $BASE_URL/health" >&2
  exit 2
fi

signup="$(curl -fsS -X POST "$BASE_URL/api/v1/auth/signup" -H 'content-type: application/json' \
  -d "{\"email\":\"content-${run_id}@example.com\",\"password\":\"pass1234\",\"name\":\"Content\"}")"
token="$(jq -r '.session.token' <<<"$signup")"

creator="$(curl -fsS -X POST "$BASE_URL/api/v1/creators" -H "authorization: Bearer $token" -H 'content-type: application/json' \
  -d "{\"slug\":\"content-creator-${run_id}\",\"displayName\":\"Content Creator\",\"bio\":\"test\"}")"
creator_id="$(jq -r '.id' <<<"$creator")"

plan="$(curl -fsS -X POST "$BASE_URL/api/v1/creators/$creator_id/plans" -H "authorization: Bearer $token" -H 'content-type: application/json' \
  -d '{"title":"Plan Content","priceAmount":10000,"currency":"IRR","interval":"month"}')"
plan_id="$(jq -r '.id' <<<"$plan")"

checkout="$(curl -fsS -X POST "$BASE_URL/api/v1/subscriptions/checkout" -H "authorization: Bearer $token" -H 'content-type: application/json' \
  -d "{\"planId\":\"$plan_id\"}")"
redirect="$(jq -r '.redirectUrl' <<<"$checkout")"
curl -fsS -L "$redirect" >/dev/null

content="$(curl -fsS -X POST "$BASE_URL/api/v1/content" -H "authorization: Bearer $token" -H 'content-type: application/json' \
  -d "{\"creatorId\":\"$creator_id\",\"title\":\"sample.txt\",\"storagePath\":\"run-$run_id/sample.txt\",\"mimeType\":\"text/plain\",\"sizeBytes\":20}")"
content_id="$(jq -r '.id' <<<"$content")"

curl -fsS -X POST "$BASE_URL/api/v1/content/$content_id/publish" -H "authorization: Bearer $token" >/dev/null

access="$(curl -fsS -X POST "$BASE_URL/api/v1/content/$content_id/access-token" -H "authorization: Bearer $token" -H 'content-type: application/json' \
  -d '{"ttlSeconds":600}')"
download_url="$(jq -r '.downloadUrl' <<<"$access")"

downloaded="$(curl -fsS "$download_url")"
if [[ "$downloaded" != "content-smoke-$run_id" ]]; then
  echo "SMOKE_FAIL: download content mismatch" >&2
  exit 2
fi

echo "SMOKE_CONTENT_OK content=$content_id"
