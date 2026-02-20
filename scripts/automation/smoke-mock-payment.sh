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
run_id="$(date +%s)-$RANDOM"
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

curl -fsS "$BASE_URL/api/v1/health/db" >/dev/null

signup="$(curl -fsS -X POST "$BASE_URL/api/v1/auth/signup" -H 'content-type: application/json' \
  -d "{\"email\":\"smoke-${run_id}@example.com\",\"password\":\"pass1234\",\"name\":\"Smoke\"}")"

token="$(jq -r '.session.token' <<<"$signup")"
user_id="$(jq -r '.user.id' <<<"$signup")"

creator="$(curl -fsS -X POST "$BASE_URL/api/v1/creators" -H "authorization: Bearer $token" -H 'content-type: application/json' \
  -d "{\"slug\":\"smoke-creator-${run_id}\",\"displayName\":\"Smoke Creator\",\"bio\":\"test\"}")"
creator_id="$(jq -r '.id' <<<"$creator")"
creator_slug="$(jq -r '.slug' <<<"$creator")"

plan="$(curl -fsS -X POST "$BASE_URL/api/v1/creators/$creator_id/plans" -H "authorization: Bearer $token" -H 'content-type: application/json' \
  -d '{"title":"Plan A","priceAmount":10000,"currency":"IRR","interval":"month"}')"
plan_id="$(jq -r '.id' <<<"$plan")"

public_creator="$(curl -fsS "$BASE_URL/api/v1/creators/$creator_slug")"
public_creator_id="$(jq -r '.id' <<<"$public_creator")"
if [[ "$public_creator_id" != "$creator_id" ]]; then
  echo "SMOKE_FAIL: expected public creator endpoint to return created creator" >&2
  exit 2
fi

public_plans="$(curl -fsS "$BASE_URL/api/v1/creators/$creator_slug/plans")"
public_plans_count="$(jq -r '.items | length' <<<"$public_plans")"
if [[ "$public_plans_count" -lt 1 ]]; then
  echo "SMOKE_FAIL: expected public plans endpoint to return at least one plan" >&2
  exit 2
fi

public_search="$(curl -fsS "$BASE_URL/api/v1/creators?q=smoke-creator-${run_id}")"
public_search_count="$(jq -r '.items | length' <<<"$public_search")"
if [[ "$public_search_count" -lt 1 ]]; then
  echo "SMOKE_FAIL: expected creators search/filter endpoint to return results" >&2
  exit 2
fi

checkout="$(curl -fsS -X POST "$BASE_URL/api/v1/subscriptions/checkout" -H "authorization: Bearer $token" -H 'content-type: application/json' \
  -d "{\"planId\":\"$plan_id\"}")"
redirect="$(jq -r '.redirectUrl' <<<"$checkout")"
payment_id="$(jq -r '.paymentId' <<<"$checkout")"
subscription_id="$(jq -r '.subscriptionId' <<<"$checkout")"

curl -fsS -L "$redirect" >/dev/null

# Callback must be idempotent: calling again should not break state.
second_cb="$(curl -fsS "$BASE_URL/api/v1/payments/mock/callback?gateway_ref=mock_${payment_id}&status=ok")"
second_status="$(jq -r '.status' <<<"$second_cb")"
if [[ "$second_status" != "SUCCEEDED" ]]; then
  echo "SMOKE_FAIL: expected callback idempotent status=SUCCEEDED, got=$second_status" >&2
  exit 2
fi

payment="$(curl -fsS "$BASE_URL/api/v1/payments/$payment_id" -H "authorization: Bearer $token")"
payment_status="$(jq -r '.status' <<<"$payment")"
if [[ "$payment_status" != "SUCCEEDED" ]]; then
  echo "SMOKE_FAIL: expected payment status SUCCEEDED, got=$payment_status" >&2
  exit 2
fi

subs="$(curl -fsS "$BASE_URL/api/v1/subscriptions/me" -H "authorization: Bearer $token")"

active_count="$(jq -r '[.items[] | select(.status=="ACTIVE")] | length' <<<"$subs")"
if [[ "$active_count" -lt 1 ]]; then
  echo "SMOKE_FAIL: expected ACTIVE subscription" >&2
  exit 2
fi

cancel="$(curl -fsS -X POST "$BASE_URL/api/v1/subscriptions/cancel" -H "authorization: Bearer $token" -H 'content-type: application/json' \
  -d "{\"subscriptionId\":\"$subscription_id\"}")"
updated="$(jq -r '.updated' <<<"$cancel")"
if [[ "$updated" != "true" ]]; then
  echo "SMOKE_FAIL: expected cancel updated=true, got=$updated" >&2
  exit 2
fi

subs_after="$(curl -fsS "$BASE_URL/api/v1/subscriptions/me" -H "authorization: Bearer $token")"
canceled_count="$(jq -r '[.items[] | select(.id=="'"$subscription_id"'" and .status=="CANCELED")] | length' <<<"$subs_after")"
if [[ "$canceled_count" -lt 1 ]]; then
  echo "SMOKE_FAIL: expected CANCELED subscription after cancel" >&2
  exit 2
fi

echo "SMOKE_OK user=$user_id creator=$creator_id plan=$plan_id payment=$payment_id subscription=$subscription_id"
