#!/usr/bin/env bash
set -euo pipefail

# Chat threads:
# - sending a private message creates a thread for sender and receiver;
# - invalid peer_id in history is rejected.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

sender_cookie="$TMP_DIR/sender.cookies"
receiver_cookie="$TMP_DIR/receiver.cookies"

register_user "ct-send-${RUN_ID}@t.io" "Thread" "Sender" true "$sender_cookie" "Thread sender bio"
sender_id="$CREATED_USER_ID"
register_user "ct-recv-${RUN_ID}@t.io" "Thread" "Receiver" true "$receiver_cookie" "Thread receiver bio"
receiver_id="$CREATED_USER_ID"

status="$(request_json POST "/api/follow/$receiver_id" '{}' "$sender_cookie")"
assert_status "sender follows receiver for thread" 200 "$status"

message="thread message ${RUN_ID}"
payload=$(printf '{"peer_id":%s,"body":"%s"}' "$receiver_id" "$message")
status="$(request_json POST /api/chats/messages "$payload" "$sender_cookie")"
assert_status "send message for thread" 200 "$status"

status="$(request_get /api/chats "$sender_cookie")"
assert_status "sender lists chat threads" 200 "$status"
assert_body_contains "sender threads include receiver" "\"peer_id\":$receiver_id"
assert_body_contains "sender threads include last message" "$message"

status="$(request_get /api/chats "$receiver_cookie")"
assert_status "receiver lists chat threads" 200 "$status"
assert_body_contains "receiver threads include sender" "\"peer_id\":$sender_id"
assert_body_contains "receiver threads include last message" "$message"

status="$(request_get "/api/chats/messages?peer_id=abc" "$sender_cookie")"
assert_status "reject chat history with weird peer id" 400 "$status"

echo "PASS: chat_threads.sh completed $pass_count checks against $BASE_URL"
