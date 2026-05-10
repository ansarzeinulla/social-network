#!/usr/bin/env bash
set -euo pipefail

# Private follow flow:
# - following a private user creates a pending request;
# - private user can accept it and the requester becomes a follower;
# - private user can decline a different request and the pending state is reset.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

requester_cookie="$TMP_DIR/requester.cookies"
requester2_cookie="$TMP_DIR/requester2.cookies"
private_cookie="$TMP_DIR/private-target.cookies"

register_user "fq-private-${RUN_ID}@t.io" "Private" "Target" false "$private_cookie" "Private target bio"
private_id="$CREATED_USER_ID"

register_user "fq-req1-${RUN_ID}@t.io" "First" "Requester" true "$requester_cookie" "First requester bio"
requester_id="$CREATED_USER_ID"

status="$(request_json POST "/api/follow/$private_id" '{}' "$requester_cookie")"
assert_status "follow private user creates request" 200 "$status"
assert_body_contains "private follow is pending" "\"status\":\"pending\""

status="$(request_get "/api/profile/$private_id" "$requester_cookie")"
assert_status "private profile loads while request is pending" 200 "$status"
assert_body_contains "relationship is pending" "\"is_pending\":true"
assert_body_contains "relationship is not accepted yet" "\"is_following\":false"

status="$(request_get /api/follow-requests "$private_cookie")"
assert_status "private user sees incoming request" 200 "$status"
assert_body_contains "incoming request includes requester" "\"id\":$requester_id"

status="$(request_json POST "/api/follow-requests/$requester_id/accept" '{}' "$private_cookie")"
assert_status "private user accepts request" 200 "$status"
assert_body_contains "accept response status" "\"status\":\"accepted\""

status="$(request_get "/api/profile/$private_id" "$requester_cookie")"
assert_status "accepted private profile loads for follower" 200 "$status"
assert_body_contains "accepted relationship is following" "\"is_following\":true"
assert_body_contains "accepted relationship is not pending" "\"is_pending\":false"
assert_body_contains "accepted follower can see private bio" "\"about_me\":\"Private target bio\""

register_user "fq-req2-${RUN_ID}@t.io" "Second" "Requester" true "$requester2_cookie" "Second requester bio"
requester2_id="$CREATED_USER_ID"

status="$(request_json POST "/api/follow/$private_id" '{}' "$requester2_cookie")"
assert_status "second private follow creates request" 200 "$status"
assert_body_contains "second private follow is pending" "\"status\":\"pending\""

status="$(request_json POST "/api/follow-requests/$requester2_id/decline" '{}' "$private_cookie")"
assert_status "private user declines request" 200 "$status"
assert_body_contains "decline response status" "\"status\":\"declined\""

status="$(request_get "/api/profile/$private_id" "$requester2_cookie")"
assert_status "declined requester can load basic private profile" 200 "$status"
assert_body_contains "declined relationship is not following" "\"is_following\":false"
assert_body_contains "declined relationship is not pending" "\"is_pending\":false"
assert_body_not_contains "declined requester cannot see private bio" "\"about_me\""

echo "PASS: follow_private.sh completed $pass_count checks against $BASE_URL"
