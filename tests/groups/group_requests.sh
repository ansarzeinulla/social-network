#!/usr/bin/env bash
set -euo pipefail

# Groups: join requests.
# - outsider requests to join, creator sees and accepts;
# - second outsider requests to join, creator declines;
# - requester cannot approve their own request.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

creator_cookie="$TMP_DIR/creator.cookies"
requester_cookie="$TMP_DIR/requester.cookies"
declined_cookie="$TMP_DIR/declined.cookies"
self_cookie="$TMP_DIR/self.cookies"

register_user "gr-create-${RUN_ID}@t.io" "Request" "Creator" true "$creator_cookie" "Request creator bio"
register_user "gr-req-${RUN_ID}@t.io" "Request" "User" true "$requester_cookie" "Request user bio"
requester_id="$CREATED_USER_ID"
register_user "gr-dec-${RUN_ID}@t.io" "Decline" "User" true "$declined_cookie" "Decline user bio"
declined_id="$CREATED_USER_ID"
register_user "gr-self-${RUN_ID}@t.io" "Self" "Approver" true "$self_cookie" "Self approver bio"
self_id="$CREATED_USER_ID"

title="GroupRequest${RUN_ID}"
status="$(request_json POST /api/groups "{\"title\":\"$title\",\"description\":\"Request flow\"}" "$creator_cookie")"
assert_status "create request test group" 200 "$status"
group_id="$(json_number_field id)"

status="$(request_json POST "/api/groups/$group_id/join" '{}' "$requester_cookie")"
assert_status "outsider requests to join" 200 "$status"
assert_body_contains "join request is requested" "\"status\":\"requested\""

status="$(request_get "/api/groups/$group_id/requests" "$creator_cookie")"
assert_status "creator lists join requests" 200 "$status"
assert_body_contains "requests include requester" "\"id\":$requester_id"

status="$(request_json POST "/api/groups/$group_id/requests/$requester_id/accept" '{}' "$creator_cookie")"
assert_status "creator accepts join request" 200 "$status"
assert_body_contains "accepted request became member" "\"status\":\"member\""

status="$(request_get "/api/groups/$group_id/members" "$creator_cookie")"
assert_status "members after request accept" 200 "$status"
assert_body_contains "members include accepted requester" "\"id\":$requester_id"

status="$(request_json POST "/api/groups/$group_id/join" '{}' "$declined_cookie")"
assert_status "second outsider requests to join" 200 "$status"
assert_body_contains "second join request is requested" "\"status\":\"requested\""

status="$(request_json POST "/api/groups/$group_id/requests/$declined_id/decline" '{}' "$creator_cookie")"
assert_status "creator declines join request" 200 "$status"
assert_body_contains "decline response" "\"status\":\"declined\""

status="$(request_get "/api/groups/$group_id/members" "$creator_cookie")"
assert_status "members after request decline" 200 "$status"
assert_body_not_contains "members do not include declined requester" "\"id\":$declined_id"

status="$(request_json POST "/api/groups/$group_id/join" '{}' "$self_cookie")"
assert_status "self-approval user requests to join" 200 "$status"
assert_body_contains "self-approval request is requested" "\"status\":\"requested\""

status="$(request_json POST "/api/groups/$group_id/accept" '{}' "$self_cookie")"
assert_status "requester cannot accept own requested membership" 400 "$status"

status="$(request_json POST "/api/groups/$group_id/requests/$self_id/accept" '{}' "$self_cookie")"
assert_status "requester cannot use creator request-accept endpoint" 403 "$status"

echo "PASS: group_requests.sh completed $pass_count checks against $BASE_URL"
