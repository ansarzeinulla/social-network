#!/usr/bin/env bash
set -euo pipefail

# Groups: invite flow.
# - creator invites user, invited user accepts and becomes member;
# - ordinary member invites another user, invited user accepts;
# - inviting an existing member is rejected.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

creator_cookie="$TMP_DIR/creator.cookies"
invitee_cookie="$TMP_DIR/invitee.cookies"
second_cookie="$TMP_DIR/second.cookies"

register_user "gi-create-${RUN_ID}@t.io" "Invite" "Creator" true "$creator_cookie" "Invite creator bio"
register_user "gi-one-${RUN_ID}@t.io" "First" "Invitee" true "$invitee_cookie" "First invitee bio"
invitee_id="$CREATED_USER_ID"
register_user "gi-two-${RUN_ID}@t.io" "Second" "Invitee" true "$second_cookie" "Second invitee bio"
second_id="$CREATED_USER_ID"

title="GroupInvite${RUN_ID}"
status="$(request_json POST /api/groups "{\"title\":\"$title\",\"description\":\"Invite flow\"}" "$creator_cookie")"
assert_status "create invite test group" 200 "$status"
group_id="$(json_number_field id)"

status="$(request_json POST "/api/groups/$group_id/invite" "{\"user_id\":$invitee_id}" "$creator_cookie")"
assert_status "creator invites first user" 200 "$status"
assert_body_contains "creator invite response" "\"status\":\"invited\""

status="$(request_json POST "/api/groups/$group_id/accept" '{}' "$invitee_cookie")"
assert_status "first invited user accepts" 200 "$status"
assert_body_contains "first invited user became member" "\"status\":\"member\""

status="$(request_get "/api/groups/$group_id/members" "$creator_cookie")"
assert_status "members list after first accept" 200 "$status"
assert_body_contains "members include first invitee" "\"id\":$invitee_id"

status="$(request_json POST "/api/groups/$group_id/invite" "{\"user_id\":$second_id}" "$invitee_cookie")"
assert_status "ordinary member invites second user" 200 "$status"
assert_body_contains "member invite response" "\"status\":\"invited\""

status="$(request_json POST "/api/groups/$group_id/accept" '{}' "$second_cookie")"
assert_status "second invited user accepts" 200 "$status"
assert_body_contains "second invited user became member" "\"status\":\"member\""

status="$(request_get "/api/groups/$group_id/members" "$creator_cookie")"
assert_status "members list after second accept" 200 "$status"
assert_body_contains "members include second invitee" "\"id\":$second_id"

status="$(request_json POST "/api/groups/$group_id/invite" "{\"user_id\":$invitee_id}" "$creator_cookie")"
assert_status "reject inviting existing member" 400 "$status"

echo "PASS: group_invites.sh completed $pass_count checks against $BASE_URL"
