#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:8080}"
RUN_ID="${RUN_ID:-$(date +%s)-$RANDOM}"

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ERROR: missing required command: $1" >&2
    exit 1
  fi
}

need_cmd curl
need_cmd jq

api() {
  local method="$1"
  local path="$2"
  local body="${3:-}"
  local token="${4:-}"
  local headers=(-H 'content-type: application/json')
  if [[ -n "$token" ]]; then
    headers+=(-H "authorization: Bearer $token")
  fi
  if [[ -n "$body" ]]; then
    curl -fsS -X "$method" "$BASE_URL$path" "${headers[@]}" -d "$body"
  else
    curl -fsS -X "$method" "$BASE_URL$path" "${headers[@]}"
  fi
}

creator_signup="$(api POST /api/v1/auth/signup "{\"email\":\"creator-${RUN_ID}@example.com\",\"password\":\"pass1234\",\"name\":\"Creator ${RUN_ID}\"}")"
creator_token="$(jq -r '.session.token' <<<"$creator_signup")"
creator_user_id="$(jq -r '.user.id' <<<"$creator_signup")"

creator="$(api POST /api/v1/creators "{\"slug\":\"creator-${RUN_ID}\",\"displayName\":\"Creator ${RUN_ID}\",\"bio\":\"Demo creator\"}" "$creator_token")"
creator_id="$(jq -r '.id' <<<"$creator")"
creator_slug="$(jq -r '.slug' <<<"$creator")"

plan="$(api POST "/api/v1/creators/${creator_id}/plans" '{"title":"Gold Plan","description":"Local demo plan","priceAmount":150000,"currency":"IRR","interval":"month"}' "$creator_token")"
plan_id="$(jq -r '.id' <<<"$plan")"

buyer_signup="$(api POST /api/v1/auth/signup "{\"email\":\"buyer-${RUN_ID}@example.com\",\"password\":\"pass1234\",\"name\":\"Buyer ${RUN_ID}\"}")"
buyer_token="$(jq -r '.session.token' <<<"$buyer_signup")"
buyer_user_id="$(jq -r '.user.id' <<<"$buyer_signup")"

checkout="$(api POST /api/v1/subscriptions/checkout "{\"planId\":\"${plan_id}\"}" "$buyer_token")"
redirect_url="$(jq -r '.redirectUrl' <<<"$checkout")"
payment_id="$(jq -r '.paymentId' <<<"$checkout")"
subscription_id="$(jq -r '.subscriptionId' <<<"$checkout")"

curl -fsS -L "$redirect_url" >/dev/null

payment_json="$(curl -fsS "$BASE_URL/api/v1/payments/${payment_id}" -H "authorization: Bearer $buyer_token")"
payment_status="$(jq -r '.status' <<<"$payment_json")"
if [[ "$payment_status" != "SUCCEEDED" ]]; then
  echo "ERROR: payment status expected SUCCEEDED got=$payment_status" >&2
  exit 2
fi

subs_json="$(curl -fsS "$BASE_URL/api/v1/subscriptions/me" -H "authorization: Bearer $buyer_token")"
active_count="$(jq -r '[.items[] | select(.id=="'"$subscription_id"'" and .status=="ACTIVE")] | length' <<<"$subs_json")"
if [[ "$active_count" -lt 1 ]]; then
  echo "ERROR: expected ACTIVE subscription for $subscription_id" >&2
  exit 2
fi

creators_count="$(curl -fsS "$BASE_URL/api/v1/creators?limit=50" | jq -r '.items | length')"

cat <<JSON
{
  "ok": true,
  "baseUrl": "$BASE_URL",
  "runId": "$RUN_ID",
  "creator": {
    "userId": "$creator_user_id",
    "id": "$creator_id",
    "slug": "$creator_slug",
    "planId": "$plan_id"
  },
  "buyer": {
    "userId": "$buyer_user_id",
    "paymentId": "$payment_id",
    "subscriptionId": "$subscription_id"
  },
  "checks": {
    "paymentStatus": "$payment_status",
    "activeSubscription": true,
    "creatorsCount": $creators_count
  }
}
JSON
