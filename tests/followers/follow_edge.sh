#!/usr/bin/env bash
set -euo pipefail

# Follow edge cases:
# - cannot follow yourself;
# - cannot follow a non-existent user;
# - unfollowing a non-followed user is safe and leaves relationship empty.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

user_cookie="$TMP_DIR/user.cookies"
other_cookie="$TMP_DIR/other.cookies"

register_user "fe-user-${RUN_ID}@t.io" "Edge" "User" true "$user_cookie" "Edge user bio"
user_id="$CREATED_USER_ID"

register_user "fe-other-${RUN_ID}@t.io" "Other" "User" true "$other_cookie" "Other user bio"
other_id="$CREATED_USER_ID"

status="$(request_json POST "/api/follow/$user_id" '{}' "$user_cookie")"
assert_status "reject self-follow" 400 "$status"

status="$(request_json POST /api/follow/999999 '{}' "$user_cookie")"
assert_status "reject follow for missing user" 400 "$status"

status="$(request_delete "/api/follow/$other_id" "$user_cookie")"
assert_status "unfollow non-followed user is safe" 200 "$status"
assert_body_contains "unfollow non-followed response" "\"status\":\"unfollowed\""

status="$(request_get "/api/profile/$other_id" "$user_cookie")"
assert_status "target profile still loads after no-op unfollow" 200 "$status"
assert_body_contains "relationship is not following after no-op unfollow" "\"is_following\":false"
assert_body_contains "relationship is not pending after no-op unfollow" "\"is_pending\":false"

echo "PASS: follow_edge.sh completed $pass_count checks against $BASE_URL"
