#!/usr/bin/env bash
set -euo pipefail

# Private chat over WebSocket:
# - connected users can send chat.send and receive chat.new;
# - no-relationship websocket send is not persisted.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

sender_cookie="$TMP_DIR/sender.cookies"
receiver_cookie="$TMP_DIR/receiver.cookies"
private_cookie="$TMP_DIR/private.cookies"

register_user "cwp-send-${RUN_ID}@t.io" "Ws" "Sender" true "$sender_cookie" "WS sender bio"
register_user "cwp-recv-${RUN_ID}@t.io" "Ws" "Receiver" true "$receiver_cookie" "WS receiver bio"
receiver_id="$CREATED_USER_ID"
register_user "cwp-priv-${RUN_ID}@t.io" "Ws" "Private" false "$private_cookie" "WS private bio"
private_id="$CREATED_USER_ID"

status="$(request_json POST "/api/follow/$receiver_id" '{}' "$sender_cookie")"
assert_status "sender follows receiver for websocket chat" 200 "$status"

message="websocket private ${RUN_ID}"
(
  cd "$SCRIPT_DIR/../../backend"
  go run ../tests/ws_client.go -base "$BASE_URL" -cookie "$sender_cookie" -mode private -to-user "$receiver_id" -body "$message" -expect chat.new >/dev/null
)
pass_count=$((pass_count + 1))
echo "ok $pass_count - websocket private chat.send receives chat.new"

status="$(request_get "/api/chats/messages?peer_id=$receiver_id" "$sender_cookie")"
assert_status "websocket private message persisted" 200 "$status"
assert_body_contains "history includes websocket private message" "$message"

blocked_message="blocked websocket private ${RUN_ID}"
(
  cd "$SCRIPT_DIR/../../backend"
  go run ../tests/ws_client.go -base "$BASE_URL" -cookie "$sender_cookie" -mode private -to-user "$private_id" -body "$blocked_message" -expect "" >/dev/null
)
pass_count=$((pass_count + 1))
echo "ok $pass_count - websocket no-relationship send returns without ack"

status="$(request_get "/api/chats/messages?peer_id=$private_id" "$sender_cookie")"
assert_status "load history with blocked private target" 200 "$status"
assert_body_not_contains "blocked websocket private message is not persisted" "$blocked_message"

echo "PASS: chat_ws_private.sh completed $pass_count checks against $BASE_URL"
