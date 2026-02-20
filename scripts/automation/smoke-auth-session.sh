#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is required for auth-session smoke." >&2
  exit 1
fi

API_PORT="${API_PORT:-4025}"
HOST="${HOST:-127.0.0.1}"
BASE_URL="http://${HOST}:${API_PORT}"
run_id="$(date +%s)-$RANDOM"

export PORT="$API_PORT"
export PUBLIC_BASE_URL="$BASE_URL"
export PAYMENT_GATEWAY="${PAYMENT_GATEWAY:-mock}"

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
  -d "{\"email\":\"auth-${run_id}@example.com\",\"password\":\"pass1234\",\"name\":\"Auth\"}")"
token1="$(jq -r '.session.token' <<<"$signup")"

refresh="$(curl -fsS -X POST "$BASE_URL/api/v1/auth/refresh" -H "authorization: Bearer $token1")"
token2="$(jq -r '.session.token' <<<"$refresh")"
if [[ -z "$token2" || "$token2" == "null" || "$token2" == "$token1" ]]; then
  echo "SMOKE_FAIL: refresh must rotate session token" >&2
  exit 2
fi

set +e
code_old="$(curl -s -o /tmp/auth_old.json -w '%{http_code}' "$BASE_URL/api/v1/me" -H "authorization: Bearer $token1")"
set -e
if [[ "$code_old" != "401" ]]; then
  echo "SMOKE_FAIL: old token after refresh must be invalid, got=$code_old" >&2
  exit 2
fi

curl -fsS "$BASE_URL/api/v1/me" -H "authorization: Bearer $token2" >/dev/null

curl -fsS -X POST "$BASE_URL/api/v1/auth/signout" -H "authorization: Bearer $token2" >/dev/null
set +e
code_signed_out="$(curl -s -o /tmp/auth_signedout.json -w '%{http_code}' "$BASE_URL/api/v1/me" -H "authorization: Bearer $token2")"
set -e
if [[ "$code_signed_out" != "401" ]]; then
  echo "SMOKE_FAIL: token after signout must be invalid, got=$code_signed_out" >&2
  exit 2
fi

signin1="$(curl -fsS -X POST "$BASE_URL/api/v1/auth/signin" -H 'content-type: application/json' \
  -d "{\"email\":\"auth-${run_id}@example.com\",\"password\":\"pass1234\"}")"
signin2="$(curl -fsS -X POST "$BASE_URL/api/v1/auth/signin" -H 'content-type: application/json' \
  -d "{\"email\":\"auth-${run_id}@example.com\",\"password\":\"pass1234\"}")"
t3="$(jq -r '.session.token' <<<"$signin1")"
t4="$(jq -r '.session.token' <<<"$signin2")"

out_all="$(curl -fsS -X POST "$BASE_URL/api/v1/auth/signout-all" -H "authorization: Bearer $t3")"
removed="$(jq -r '.removed' <<<"$out_all")"
if [[ "$removed" -lt 1 ]]; then
  echo "SMOKE_FAIL: signout-all must remove at least one session" >&2
  exit 2
fi

set +e
code_t3="$(curl -s -o /tmp/auth_t3.json -w '%{http_code}' "$BASE_URL/api/v1/me" -H "authorization: Bearer $t3")"
code_t4="$(curl -s -o /tmp/auth_t4.json -w '%{http_code}' "$BASE_URL/api/v1/me" -H "authorization: Bearer $t4")"
set -e
if [[ "$code_t3" != "401" || "$code_t4" != "401" ]]; then
  echo "SMOKE_FAIL: signout-all must invalidate all sessions; got t3=$code_t3 t4=$code_t4" >&2
  exit 2
fi

echo "SMOKE_AUTH_SESSION_OK"
