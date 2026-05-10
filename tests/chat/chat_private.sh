#!/usr/bin/env bash
set -euo pipefail

# Private chat:
# - sender can message a connected user with an emoji payload;
# - empty message is rejected;
# - sender cannot message a private profile with no relationship.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

sender_cookie="$TMP_DIR/sender.cookies"
receiver_cookie="$TMP_DIR/receiver.cookies"
private_cookie="$TMP_DIR/private.cookies"

register_user "cp-send-${RUN_ID}@t.io" "Chat" "Sender" true "$sender_cookie" "Chat sender bio"
register_user "cp-recv-${RUN_ID}@t.io" "Chat" "Receiver" true "$receiver_cookie" "Chat receiver bio"
receiver_id="$CREATED_USER_ID"
register_user "cp-priv-${RUN_ID}@t.io" "Chat" "Private" false "$private_cookie" "Private chat target bio"
private_id="$CREATED_USER_ID"

status="$(request_json POST "/api/follow/$receiver_id" '{}' "$sender_cookie")"
assert_status "sender follows receiver before chat" 200 "$status"
assert_body_contains "chat follow accepted" "\"status\":\"accepted\""

payload=$(printf '{"peer_id":%s,"body":"hello from chat test \\ud83d\\ude80"}' "$receiver_id")
status="$(request_json POST /api/chats/messages "$payload" "$sender_cookie")"
assert_status "send private chat message with emoji" 200 "$status"
assert_body_contains "chat send returns id" "\"id\":"

status="$(request_get "/api/chats/messages?peer_id=$receiver_id" "$sender_cookie")"
assert_status "load private chat history" 200 "$status"
assert_body_contains "chat history includes message text" "hello from chat test"

empty_payload=$(printf '{"peer_id":%s,"body":""}' "$receiver_id")
status="$(request_json POST /api/chats/messages "$empty_payload" "$sender_cookie")"
assert_status "reject empty private chat message" 400 "$status"

forbidden_payload=$(printf '{"peer_id":%s,"body":"not connected"}' "$private_id")
status="$(request_json POST /api/chats/messages "$forbidden_payload" "$sender_cookie")"
assert_status "reject private chat without relationship" 403 "$status"

echo "PASS: chat_private.sh completed $pass_count checks against $BASE_URL"
