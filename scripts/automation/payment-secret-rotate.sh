#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT_DIR="$ROOT_DIR/.local-run/secrets"
mkdir -p "$OUT_DIR"

next_secret="$(node -e "const c=require('crypto');process.stdout.write(c.randomBytes(32).toString('base64url'))")"
out_file="$OUT_DIR/payment_gateway_webhook_secret.next"

cat > "$out_file" <<EOF
# generated_at=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
PAYMENT_GATEWAY_WEBHOOK_SECRET_NEXT=$next_secret
EOF

chmod 600 "$out_file" || true
echo "PAYMENT_SECRET_ROTATE_OK file=$out_file"
