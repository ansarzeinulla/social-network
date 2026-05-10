#!/usr/bin/env bash
set -euo pipefail

# Group edge cases.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

creator_cookie="$TMP_DIR/creator.cookies"
member_cookie="$TMP_DIR/member.cookies"
outsider_cookie="$TMP_DIR/outsider.cookies"
lonely_cookie="$TMP_DIR/lonely.cookies"

register_user "ge-create-${RUN_ID}@t.io" "Group" "EdgeCreator" true "$creator_cookie" "Group edge creator bio"
register_user "ge-member-${RUN_ID}@t.io" "Group" "EdgeMember" true "$member_cookie" "Group edge member bio"
member_id="$CREATED_USER_ID"
register_user "ge-out-${RUN_ID}@t.io" "Group" "EdgeOut" true "$outsider_cookie" "Group edge out bio"
outsider_id="$CREATED_USER_ID"
register_user "ge-lone-${RUN_ID}@t.io" "Group" "Lonely" true "$lonely_cookie" "Group lonely bio"

status="$(request_json POST /api/groups "{\"title\":\"GroupEdge${RUN_ID}\",\"description\":\"Group edge\"}" "$creator_cookie")"
assert_status "create group for edge tests" 200 "$status"
group_id="$(json_number_field id)"

status="$(request_get "/api/groups/$group_id" "$creator_cookie")"
assert_status "get group details" 200 "$status"
assert_body_contains "group details include title" "GroupEdge${RUN_ID}"

status="$(request_get /api/groups/999999 "$creator_cookie")"
assert_status "missing group returns 404" 404 "$status"

status="$(request_get /api/groups/abc "$creator_cookie")"
assert_status "weird group id returns bad request" 400 "$status"

status="$(request_json POST "/api/groups/$group_id/invite" "{\"user_id\":$member_id}" "$outsider_cookie")"
assert_status "non-member cannot invite into group" 403 "$status"

status="$(request_json POST "/api/groups/$group_id/accept" '{}' "$lonely_cookie")"
assert_status "cannot accept group invite that does not exist" 400 "$status"

status="$(request_get "/api/groups/$group_id/requests" "$outsider_cookie")"
assert_status "non-creator cannot list group requests" 403 "$status"

status="$(request_json POST "/api/groups/$group_id/invite" "{\"user_id\":$outsider_id}" "$creator_cookie")"
assert_status "creator invites outsider for final membership check" 200 "$status"
status="$(request_json POST "/api/groups/$group_id/accept" '{}' "$outsider_cookie")"
assert_status "outsider accepts final invite" 200 "$status"

echo "PASS: group_edge.sh completed $pass_count checks against $BASE_URL"
