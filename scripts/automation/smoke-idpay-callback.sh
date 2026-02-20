#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is required for smoke test." >&2
  exit 1
fi

if [[ -z "${PAYMENT_GATEWAY_WEBHOOK_SECRET:-}" ]]; then
  echo "ERROR: PAYMENT_GATEWAY_WEBHOOK_SECRET is required for idpay smoke." >&2
  exit 1
fi

API_PORT="${API_PORT:-4012}"
HOST="${HOST:-127.0.0.1}"
BASE_URL="http://${HOST}:${API_PORT}"
run_id="$(date +%s)-$RANDOM"

export PORT="$API_PORT"
export PUBLIC_BASE_URL="$BASE_URL"
export PAYMENT_GATEWAY="idpay"
export PAYMENT_GATEWAY_BASE_URL="$BASE_URL/provider-idpay"

cleanup() {
  if [[ -n "${api_pid:-}" ]]; then
    kill "$api_pid" >/dev/null 2>&1 || true
  fi
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

signup="$(curl -fsS -X POST "$BASE_URL/api/v1/auth/signup" -H 'content-type: application/json' \
  -d "{\"email\":\"idpay-smoke-${run_id}@example.com\",\"password\":\"pass1234\",\"name\":\"Smoke\"}")"
token="$(jq -r '.session.token' <<<"$signup")"

creator="$(curl -fsS -X POST "$BASE_URL/api/v1/creators" -H "authorization: Bearer $token" -H 'content-type: application/json' \
  -d "{\"slug\":\"idpay-creator-${run_id}\",\"displayName\":\"IDPay Creator\",\"bio\":\"test\"}")"
creator_id="$(jq -r '.id' <<<"$creator")"

plan="$(curl -fsS -X POST "$BASE_URL/api/v1/creators/$creator_id/plans" -H "authorization: Bearer $token" -H 'content-type: application/json' \
  -d '{"title":"Plan IDPay","priceAmount":10000,"currency":"IRR","interval":"month"}')"
plan_id="$(jq -r '.id' <<<"$plan")"

checkout="$(curl -fsS -X POST "$BASE_URL/api/v1/subscriptions/checkout" -H "authorization: Bearer $token" -H 'content-type: application/json' \
  -d "{\"planId\":\"$plan_id\"}")"
payment_id="$(jq -r '.paymentId' <<<"$checkout")"
gateway_ref="idpay_${payment_id}"

sig="$(node -e "const c=require('crypto');const s=process.argv[1];const v=process.argv[2];process.stdout.write(c.createHmac('sha256', s).update(v).digest('base64url'))" \
  "$PAYMENT_GATEWAY_WEBHOOK_SECRET" "${gateway_ref}:paid")"

cb="$(curl -fsS -X POST "$BASE_URL/api/v1/payments/idpay/callback" \
  -H "x-gateway-signature: $sig" \
  -H 'content-type: application/json' \
  -d "{\"gateway_ref\":\"$gateway_ref\",\"status\":\"paid\"}")"

result="$(jq -r '.result' <<<"$cb")"
if [[ "$result" != "succeeded" ]]; then
  echo "SMOKE_FAIL: expected idpay callback result=succeeded, got=$result" >&2
  exit 2
fi

cb_replay="$(curl -fsS -X POST "$BASE_URL/api/v1/payments/idpay/callback" \
  -H "x-gateway-signature: $sig" \
  -H 'content-type: application/json' \
  -d "{\"gateway_ref\":\"$gateway_ref\",\"status\":\"paid\"}")"
replay_flag="$(jq -r '.replayed // false' <<<"$cb_replay")"
if [[ "$replay_flag" != "true" ]]; then
  echo "SMOKE_FAIL: expected replayed=true on duplicate callback, got=$replay_flag" >&2
  exit 2
fi

payment="$(curl -fsS "$BASE_URL/api/v1/payments/$payment_id" -H "authorization: Bearer $token")"
status="$(jq -r '.status' <<<"$payment")"
if [[ "$status" != "SUCCEEDED" ]]; then
  echo "SMOKE_FAIL: expected payment status SUCCEEDED, got=$status" >&2
  exit 2
fi

echo "SMOKE_IDPAY_OK payment=$payment_id gateway_ref=$gateway_ref"
