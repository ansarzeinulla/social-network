#!/usr/bin/env bash
set -euo pipefail

# Direct post privacy:
# - public post is visible to everyone;
# - almost_private post is visible only to accepted followers and author;
# - private post is visible only to selected viewers and author;
# - forbidden users are rejected even when they hit /api/post?id=... directly.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

author_cookie="$TMP_DIR/author.cookies"
follower_cookie="$TMP_DIR/follower.cookies"
viewer_cookie="$TMP_DIR/viewer.cookies"
stranger_cookie="$TMP_DIR/stranger.cookies"

register_user "pp-author-${RUN_ID}@t.io" "Privacy" "Author" true "$author_cookie" "Privacy author bio"
author_id="$CREATED_USER_ID"
register_user "pp-follow-${RUN_ID}@t.io" "Accepted" "Follower" true "$follower_cookie" "Follower bio"
follower_id="$CREATED_USER_ID"
register_user "pp-viewer-${RUN_ID}@t.io" "Selected" "Viewer" true "$viewer_cookie" "Viewer bio"
viewer_id="$CREATED_USER_ID"
register_user "pp-strange-${RUN_ID}@t.io" "Post" "Stranger" true "$stranger_cookie" "Stranger bio"

status="$(request_json POST "/api/follow/$author_id" '{}' "$follower_cookie")"
assert_status "accepted follower follows author" 200 "$status"
assert_body_contains "follower relationship accepted" "\"status\":\"accepted\""
status="$(request_json POST "/api/follow/$author_id" '{}' "$viewer_cookie")"
assert_status "selected viewer follows author" 200 "$status"
assert_body_contains "viewer relationship accepted" "\"status\":\"accepted\""

public_content="privacy public ${RUN_ID}"
almost_content="privacy almost ${RUN_ID}"
private_content="privacy private ${RUN_ID}"

status="$(request_form POST /api/posts/create "$author_cookie" -F "content=$public_content" -F "privacy=public")"
assert_status "create public post" 201 "$status"
status="$(request_form POST /api/posts/create "$author_cookie" -F "content=$almost_content" -F "privacy=almost_private")"
assert_status "create almost private post" 201 "$status"
status="$(request_form POST /api/posts/create "$author_cookie" -F "content=$private_content" -F "privacy=private" -F "viewers=$viewer_id")"
assert_status "create private post for selected viewer" 201 "$status"

status="$(request_get "/api/users/$author_id/posts" "$author_cookie")"
assert_status "author loads own posts" 200 "$status"
public_id="$(post_id_by_content "$public_content")"
almost_id="$(post_id_by_content "$almost_content")"
private_id="$(post_id_by_content "$private_content")"
if [[ -z "$public_id" || -z "$almost_id" || -z "$private_id" ]]; then
  echo "FAIL: could not extract one or more post ids" >&2
  cat "$LAST_BODY" >&2
  exit 1
fi

status="$(request_get "/api/post?id=$public_id" "$stranger_cookie")"
assert_status "stranger can open public post by id" 200 "$status"
assert_body_contains "public direct response includes content" "$public_content"

status="$(request_get "/api/post?id=$almost_id" "$follower_cookie")"
assert_status "accepted follower can open almost private post" 200 "$status"
assert_body_contains "almost private direct response includes content" "$almost_content"

status="$(request_get "/api/post?id=$almost_id" "$stranger_cookie")"
assert_status "stranger cannot open almost private post by id" 403 "$status"

status="$(request_get "/api/post?id=$private_id" "$viewer_cookie")"
assert_status "selected viewer can open private post" 200 "$status"
assert_body_contains "private direct response includes content" "$private_content"

status="$(request_get "/api/post?id=$private_id" "$follower_cookie")"
assert_status "unselected follower cannot open private post by id" 403 "$status"

status="$(request_get "/api/post?id=$private_id" "$stranger_cookie")"
assert_status "stranger cannot open private post by id" 403 "$status"

echo "PASS: post_privacy.sh completed $pass_count checks against $BASE_URL"
