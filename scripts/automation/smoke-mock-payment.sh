#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is required for smoke test." >&2
  exit 1
fi

API_PORT="${API_PORT:-4010}"
HOST="${HOST:-127.0.0.1}"
BASE_URL="http://${HOST}:${API_PORT}"

export PORT="$API_PORT"
export PUBLIC_BASE_URL="$BASE_URL"
export PAYMENT_GATEWAY="${PAYMENT_GATEWAY:-mock}"

tmp="$(mktemp -d)"
cleanup() {
  if [[ -n "${api_pid:-}" ]]; then
    kill "$api_pid" >/dev/null 2>&1 || true
  fi
  rm -rf "$tmp"
}
trap cleanup EXIT

pnpm -C apps/api build >/dev/null
node apps/api/dist/server.js >/dev/null 2>&1 &
api_pid="$!"

for _ in $(seq 1 50); do
  if curl -fsS "$BASE_URL/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.1
done

signup="$(curl -fsS -X POST "$BASE_URL/api/v1/auth/signup" -H 'content-type: application/json' \
  -d '{"email":"smoke@example.com","password":"pass1234","name":"Smoke"}')"

token="$(jq -r '.session.token' <<<"$signup")"
user_id="$(jq -r '.user.id' <<<"$signup")"

creator="$(curl -fsS -X POST "$BASE_URL/api/v1/creators" -H "authorization: Bearer $token" -H 'content-type: application/json' \
  -d '{"slug":"smoke-creator","displayName":"Smoke Creator","bio":"test"}')"
creator_id="$(jq -r '.id' <<<"$creator")"

plan="$(curl -fsS -X POST "$BASE_URL/api/v1/creators/$creator_id/plans" -H "authorization: Bearer $token" -H 'content-type: application/json' \
  -d '{"title":"Plan A","priceAmount":10000,"currency":"IRR","interval":"month"}')"
plan_id="$(jq -r '.id' <<<"$plan")"

checkout="$(curl -fsS -X POST "$BASE_URL/api/v1/subscriptions/checkout" -H "authorization: Bearer $token" -H 'content-type: application/json' \
  -d "{\"planId\":\"$plan_id\"}")"
redirect="$(jq -r '.redirectUrl' <<<"$checkout")"

curl -fsS -L "$redirect" >/dev/null

subs="$(curl -fsS "$BASE_URL/api/v1/subscriptions/me" -H "authorization: Bearer $token")"

active_count="$(jq -r '[.items[] | select(.status=="ACTIVE")] | length' <<<"$subs")"
if [[ "$active_count" -lt 1 ]]; then
  echo "SMOKE_FAIL: expected ACTIVE subscription" >&2
  exit 2
fi

echo "SMOKE_OK user=$user_id creator=$creator_id plan=$plan_id"

