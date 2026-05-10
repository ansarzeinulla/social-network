#!/usr/bin/env bash
set -euo pipefail

# Post comments privacy:
# - comment reads are blocked when the post itself is invisible.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

author_cookie="$TMP_DIR/author.cookies"
viewer_cookie="$TMP_DIR/viewer.cookies"
stranger_cookie="$TMP_DIR/stranger.cookies"

register_user "pcp-author-${RUN_ID}@t.io" "Comment" "Author" true "$author_cookie"
author_id="$CREATED_USER_ID"
register_user "pcp-view-${RUN_ID}@t.io" "Comment" "Viewer" true "$viewer_cookie"
viewer_id="$CREATED_USER_ID"
register_user "pcp-strange-${RUN_ID}@t.io" "Comment" "Stranger" true "$stranger_cookie"

status="$(request_json POST "/api/follow/$author_id" '{}' "$viewer_cookie")"
assert_status "viewer follows author for private comment read" 200 "$status"

private_content="private comments visible ${RUN_ID}"
status="$(request_form POST /api/posts/create "$author_cookie" \
  -F "content=$private_content" \
  -F "privacy=private" \
  -F "viewers=$viewer_id")"
assert_status "create private post for comment privacy read" 201 "$status"

status="$(request_get "/api/users/$author_id/posts" "$author_cookie")"
assert_status "load author posts for private comment read id" 200 "$status"
post_id="$(post_id_by_content "$private_content")"

status="$(request_json POST "/api/posts/$post_id/comments" "{\"content\":\"allowed comment ${RUN_ID}\"}" "$viewer_cookie")"
assert_status "selected viewer comments on private post" 200 "$status"

status="$(request_get "/api/posts/$post_id/comments" "$viewer_cookie")"
assert_status "selected viewer reads private post comments" 200 "$status"
assert_body_contains "selected viewer sees private comment" "allowed comment ${RUN_ID}"

status="$(request_get "/api/posts/$post_id/comments" "$stranger_cookie")"
assert_status "stranger cannot read comments for invisible post" 403 "$status"

echo "PASS: post_comments_privacy.sh completed $pass_count checks against $BASE_URL"
