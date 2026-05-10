#!/usr/bin/env bash
set -euo pipefail

# WebSocket auth:
# - /ws rejects an upgrade without a valid session;
# - /ws rejects an upgrade with a fake session cookie.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

ws_status() {
  local cookie_header="${1:-}"
  if [[ -n "$cookie_header" ]]; then
    curl -sS "$BASE_URL/ws" \
      -H "Connection: Upgrade" \
      -H "Upgrade: websocket" \
      -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
      -H "Sec-WebSocket-Version: 13" \
      -H "Cookie: $cookie_header" \
      -o "$LAST_BODY" \
      -w "%{http_code}"
  else
    curl -sS "$BASE_URL/ws" \
      -H "Connection: Upgrade" \
      -H "Upgrade: websocket" \
      -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
      -H "Sec-WebSocket-Version: 13" \
      -o "$LAST_BODY" \
      -w "%{http_code}"
  fi
}

status="$(ws_status)"
assert_status "websocket upgrade without session is rejected" 401 "$status"

status="$(ws_status "session_token=fake-or-expired-${RUN_ID}")"
assert_status "websocket upgrade with fake session is rejected" 401 "$status"

echo "PASS: chat_ws_drops.sh completed $pass_count checks against $BASE_URL"
