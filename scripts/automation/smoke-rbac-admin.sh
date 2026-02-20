#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is required for RBAC smoke." >&2
  exit 1
fi

API_PORT="${API_PORT:-4015}"
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
  -d "{\"email\":\"rbac-${run_id}@example.com\",\"password\":\"pass1234\",\"name\":\"RBAC\"}")"
user_id="$(jq -r '.user.id' <<<"$signup")"
token="$(jq -r '.session.token' <<<"$signup")"

set +e
code_user="$(curl -s -o /tmp/rbac_user_resp.json -w '%{http_code}' "$BASE_URL/api/v1/admin/payments" \
  -H "authorization: Bearer $token")"
set -e
if [[ "$code_user" != "403" ]]; then
  echo "SMOKE_FAIL: expected 403 for user role on admin payments, got=$code_user" >&2
  exit 2
fi

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "UPDATE users SET role='platform_admin' WHERE id='${user_id}'" >/dev/null

code_admin="$(curl -s -o /tmp/rbac_admin_resp.json -w '%{http_code}' "$BASE_URL/api/v1/admin/payments" \
  -H "authorization: Bearer $token")"
if [[ "$code_admin" != "200" ]]; then
  echo "SMOKE_FAIL: expected 200 for platform_admin on admin payments, got=$code_admin" >&2
  exit 2
fi

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "UPDATE users SET role='auditor' WHERE id='${user_id}'" >/dev/null

set +e
code_auditor_reconcile="$(curl -s -o /tmp/rbac_auditor_resp.json -w '%{http_code}' -X POST "$BASE_URL/api/v1/payments/reconcile" \
  -H "authorization: Bearer $token" \
  -H 'content-type: application/json' \
  -d '{}')"
set -e
if [[ "$code_auditor_reconcile" != "403" ]]; then
  echo "SMOKE_FAIL: expected 403 for auditor on reconcile, got=$code_auditor_reconcile" >&2
  exit 2
fi

code_auditor_overview="$(curl -s -o /tmp/rbac_auditor_overview.json -w '%{http_code}' "$BASE_URL/api/v1/admin/overview" \
  -H "authorization: Bearer $token")"
if [[ "$code_auditor_overview" != "200" ]]; then
  echo "SMOKE_FAIL: expected 200 for auditor on admin overview, got=$code_auditor_overview" >&2
  exit 2
fi

if ! jq -e '.counts.users >= 1 and .counts.creators >= 0 and (.subscriptions|type=="object") and (.payments|type=="object")' /tmp/rbac_auditor_overview.json >/dev/null; then
  echo "SMOKE_FAIL: admin overview response shape invalid" >&2
  exit 2
fi

echo "SMOKE_RBAC_OK user=$user_id"
