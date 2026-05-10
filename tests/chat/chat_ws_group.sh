#!/usr/bin/env bash
set -euo pipefail

# Group chat over WebSocket:
# - member sends group_chat.send and receives group_chat.new;
# - non-member websocket send is not persisted.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

creator_cookie="$TMP_DIR/creator.cookies"
member_cookie="$TMP_DIR/member.cookies"
outsider_cookie="$TMP_DIR/outsider.cookies"

register_user "cwg-create-${RUN_ID}@t.io" "Ws" "GroupCreator" true "$creator_cookie" "WS group creator bio"
register_user "cwg-member-${RUN_ID}@t.io" "Ws" "GroupMember" true "$member_cookie" "WS group member bio"
member_id="$CREATED_USER_ID"
register_user "cwg-out-${RUN_ID}@t.io" "Ws" "Outsider" true "$outsider_cookie" "WS group outsider bio"

status="$(request_json POST /api/groups "{\"title\":\"WsGroup${RUN_ID}\",\"description\":\"WS group chat\"}" "$creator_cookie")"
assert_status "create group for websocket group chat" 200 "$status"
group_id="$(json_number_field id)"
status="$(request_json POST "/api/groups/$group_id/invite" "{\"user_id\":$member_id}" "$creator_cookie")"
assert_status "invite member for websocket group chat" 200 "$status"
status="$(request_json POST "/api/groups/$group_id/accept" '{}' "$member_cookie")"
assert_status "member accepts websocket group invite" 200 "$status"

message="websocket group ${RUN_ID}"
(
  cd "$SCRIPT_DIR/../../backend"
  go run ../tests/ws_client.go -base "$BASE_URL" -cookie "$creator_cookie" -mode group -group "$group_id" -body "$message" -expect group_chat.new >/dev/null
)
pass_count=$((pass_count + 1))
echo "ok $pass_count - websocket group_chat.send receives group_chat.new"

status="$(request_get "/api/groups/chat/history?group_id=$group_id" "$member_cookie")"
assert_status "websocket group message persisted" 200 "$status"
assert_body_contains "group history includes websocket message" "$message"

blocked_message="blocked websocket group ${RUN_ID}"
(
  cd "$SCRIPT_DIR/../../backend"
  go run ../tests/ws_client.go -base "$BASE_URL" -cookie "$outsider_cookie" -mode group -group "$group_id" -body "$blocked_message" -expect "" >/dev/null
)
pass_count=$((pass_count + 1))
echo "ok $pass_count - websocket non-member group send returns without ack"

status="$(request_get "/api/groups/chat/history?group_id=$group_id" "$member_cookie")"
assert_status "member reloads group history after blocked websocket send" 200 "$status"
assert_body_not_contains "blocked websocket group message is not persisted" "$blocked_message"

echo "PASS: chat_ws_group.sh completed $pass_count checks against $BASE_URL"
