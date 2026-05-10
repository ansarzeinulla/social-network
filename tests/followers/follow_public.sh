#!/usr/bin/env bash
set -euo pipefail

# Public follow flow:
# - following a public user is accepted immediately;
# - unfollow succeeds and clears relationship state.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

follower_cookie="$TMP_DIR/follower.cookies"
target_cookie="$TMP_DIR/public-target.cookies"

register_user "fp-follower-${RUN_ID}@t.io" "Public" "Follower" true "$follower_cookie" "Follower bio"
register_user "fp-target-${RUN_ID}@t.io" "Public" "Target" true "$target_cookie" "Public target bio"
target_id="$CREATED_USER_ID"

status="$(request_json POST "/api/follow/$target_id" '{}' "$follower_cookie")"
assert_status "follow public user" 200 "$status"
assert_body_contains "public follow is accepted" "\"status\":\"accepted\""

status="$(request_get "/api/profile/$target_id" "$follower_cookie")"
assert_status "followed public profile loads" 200 "$status"
assert_body_contains "relationship is following" "\"is_following\":true"
assert_body_contains "relationship is not pending" "\"is_pending\":false"

status="$(request_delete "/api/follow/$target_id" "$follower_cookie")"
assert_status "unfollow public user" 200 "$status"
assert_body_contains "unfollow response" "\"status\":\"unfollowed\""

status="$(request_get "/api/profile/$target_id" "$follower_cookie")"
assert_status "public profile loads after unfollow" 200 "$status"
assert_body_contains "relationship is no longer following" "\"is_following\":false"
assert_body_contains "relationship remains not pending" "\"is_pending\":false"

echo "PASS: follow_public.sh completed $pass_count checks against $BASE_URL"
