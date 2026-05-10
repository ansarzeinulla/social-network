#!/usr/bin/env bash
set -euo pipefail

# CORS preflight:
# - OPTIONS requests are answered before auth middleware;
# - expected credential and method headers are present.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

headers="$TMP_DIR/options.headers"
body="$TMP_DIR/options.body"

status="$(curl -sS -X OPTIONS "$BASE_URL/api/profile" \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -D "$headers" \
  -o "$body" \
  -w "%{http_code}")"
assert_status "OPTIONS preflight bypasses auth" 200 "$status"

if ! grep -Fiq "Access-Control-Allow-Origin: http://localhost:3000" "$headers"; then
  echo "FAIL: missing CORS allow-origin header" >&2
  cat "$headers" >&2
  exit 1
fi
pass_count=$((pass_count + 1))
echo "ok $pass_count - CORS allow-origin header is present"

if ! grep -Fiq "Access-Control-Allow-Credentials: true" "$headers"; then
  echo "FAIL: missing CORS credentials header" >&2
  cat "$headers" >&2
  exit 1
fi
pass_count=$((pass_count + 1))
echo "ok $pass_count - CORS credentials header is present"

if ! grep -Fi "Access-Control-Allow-Methods:" "$headers" | grep -q "OPTIONS"; then
  echo "FAIL: CORS allowed methods does not include OPTIONS" >&2
  cat "$headers" >&2
  exit 1
fi
pass_count=$((pass_count + 1))
echo "ok $pass_count - CORS allowed methods include OPTIONS"

echo "PASS: options.sh completed $pass_count checks against $BASE_URL"
