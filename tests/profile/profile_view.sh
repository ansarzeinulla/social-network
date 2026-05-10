#!/usr/bin/env bash
set -euo pipefail

# Profile visibility test:
# - own profile is fully visible;
# - public profile exposes profile data, posts, followers and following;
# - private profile for a non-follower exposes only basic profile data and
#   blocks protected profile datasets with 403.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

viewer_cookie="$TMP_DIR/viewer.cookies"
public_cookie="$TMP_DIR/public.cookies"
private_cookie="$TMP_DIR/private.cookies"

register_user "pv-viewer-${RUN_ID}@t.io" "Profile" "Viewer" true "$viewer_cookie" "Viewer full bio"
viewer_id="$CREATED_USER_ID"

status="$(request_get /api/profile "$viewer_cookie")"
assert_status "own profile is visible" 200 "$status"
assert_body_contains "own profile includes email" "\"email\":\"pv-viewer-${RUN_ID}@t.io\""
assert_body_contains "own profile includes about_me" "\"about_me\":\"Viewer full bio\""
assert_body_contains "own profile is marked as self" "\"is_self\":true"

register_user "pv-public-${RUN_ID}@t.io" "Public" "Profile" true "$public_cookie" "Public full bio"
public_id="$CREATED_USER_ID"
status="$(request_form POST /api/posts/create "$public_cookie" \
  -F "content=public profile visible post ${RUN_ID}" \
  -F "privacy=public")"
assert_status "prepare public user's visible post" 201 "$status"

status="$(request_json POST "/api/follow/$public_id" '{}' "$viewer_cookie")"
assert_status "viewer follows public user immediately" 200 "$status"
assert_body_contains "public follow is accepted" "\"status\":\"accepted\""

status="$(request_get "/api/profile/$public_id" "$viewer_cookie")"
assert_status "other public profile is visible" 200 "$status"
assert_body_contains "public profile exposes bio" "\"about_me\":\"Public full bio\""
assert_body_contains "public profile includes follower count" "\"followers_count\":"
assert_body_contains "public profile includes following count" "\"following_count\":"
assert_body_contains "viewer is following public profile" "\"is_following\":true"

status="$(request_get "/api/users/$public_id/posts" "$viewer_cookie")"
assert_status "public profile posts are visible" 200 "$status"
assert_body_contains "public profile posts include created post" "public profile visible post ${RUN_ID}"

status="$(request_get "/api/users/$public_id/followers" "$viewer_cookie")"
assert_status "public profile followers are visible" 200 "$status"
assert_body_contains "public profile followers include viewer" "\"id\":$viewer_id"

status="$(request_get "/api/users/$public_id/following" "$viewer_cookie")"
assert_status "public profile following list is visible" 200 "$status"

register_user "pv-private-${RUN_ID}@t.io" "Private" "Profile" false "$private_cookie" "Hidden private bio"
private_id="$CREATED_USER_ID"
status="$(request_form POST /api/posts/create "$private_cookie" \
  -F "content=private profile hidden post ${RUN_ID}" \
  -F "privacy=public")"
assert_status "prepare private user's post" 201 "$status"

status="$(request_get "/api/profile/$private_id" "$viewer_cookie")"
assert_status "private profile basic info is visible to non-follower" 200 "$status"
assert_body_contains "private profile exposes first name" "\"first_name\":\"Private\""
assert_body_contains "private profile exposes last name" "\"last_name\":\"Profile\""
assert_body_contains "private profile exposes privacy flag" "\"is_public\":false"
assert_body_not_contains "private profile hides email" "\"email\""
assert_body_not_contains "private profile hides about_me" "\"about_me\""
assert_body_not_contains "private profile hides follower count" "\"followers_count\":"
assert_body_not_contains "private profile hides following count" "\"following_count\":"

status="$(request_get "/api/users/$private_id/posts" "$viewer_cookie")"
assert_status "private profile posts are forbidden to non-follower" 403 "$status"

status="$(request_get "/api/users/$private_id/followers" "$viewer_cookie")"
assert_status "private profile followers are forbidden to non-follower" 403 "$status"

status="$(request_get "/api/users/$private_id/following" "$viewer_cookie")"
assert_status "private profile following is forbidden to non-follower" 403 "$status"

echo "PASS: profile_view.sh completed $pass_count checks against $BASE_URL"
