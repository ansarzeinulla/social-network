#!/usr/bin/env bash
set -euo pipefail

# Group chat:
# - member sends a message and another member reads history;
# - non-member cannot read history or send into the group chat.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

creator_cookie="$TMP_DIR/creator.cookies"
member_cookie="$TMP_DIR/member.cookies"
outsider_cookie="$TMP_DIR/outsider.cookies"

register_user "cg-create-${RUN_ID}@t.io" "Chat" "GroupCreator" true "$creator_cookie" "Group chat creator bio"
register_user "cg-member-${RUN_ID}@t.io" "Chat" "GroupMember" true "$member_cookie" "Group chat member bio"
member_id="$CREATED_USER_ID"
register_user "cg-out-${RUN_ID}@t.io" "Chat" "Outsider" true "$outsider_cookie" "Group chat outsider bio"

status="$(request_json POST /api/groups "{\"title\":\"ChatGroup${RUN_ID}\",\"description\":\"Group chat flow\"}" "$creator_cookie")"
assert_status "create group for group chat" 200 "$status"
group_id="$(json_number_field id)"

status="$(request_json POST "/api/groups/$group_id/invite" "{\"user_id\":$member_id}" "$creator_cookie")"
assert_status "invite group chat member" 200 "$status"
status="$(request_json POST "/api/groups/$group_id/accept" '{}' "$member_cookie")"
assert_status "group chat member accepts invite" 200 "$status"

message="group chat message ${RUN_ID}"
payload=$(printf '{"group_id":%s,"body":"%s"}' "$group_id" "$message")
status="$(request_json POST /api/groups/chat/history "$payload" "$creator_cookie")"
assert_status "send group chat message" 200 "$status"
assert_body_contains "group chat send returns id" "\"id\":"

status="$(request_get "/api/groups/chat/history?group_id=$group_id" "$member_cookie")"
assert_status "member reads group chat history" 200 "$status"
assert_body_contains "group chat history includes sent message" "$message"

status="$(request_get "/api/groups/chat/history?group_id=$group_id" "$outsider_cookie")"
assert_status "non-member cannot read group chat history" 403 "$status"

outsider_payload=$(printf '{"group_id":%s,"body":"outsider group message"}' "$group_id")
status="$(request_json POST /api/groups/chat/history "$outsider_payload" "$outsider_cookie")"
assert_status "non-member cannot send group chat message" 403 "$status"

echo "PASS: chat_group.sh completed $pass_count checks against $BASE_URL"
