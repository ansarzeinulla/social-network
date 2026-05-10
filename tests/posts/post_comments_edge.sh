#!/usr/bin/env bash
set -euo pipefail

# Comment edge cases:
# - empty comment is rejected;
# - comments on missing or malformed post ids are rejected strictly.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

author_cookie="$TMP_DIR/author.cookies"
register_user "pce-author-${RUN_ID}@t.io" "Comment" "Edge" true "$author_cookie" "Comment edge bio"
author_id="$CREATED_USER_ID"

content="comment edge post ${RUN_ID}"
status="$(request_form POST /api/posts/create "$author_cookie" -F "content=$content" -F "privacy=public")"
assert_status "create post for comment edge" 201 "$status"

status="$(request_get "/api/users/$author_id/posts" "$author_cookie")"
assert_status "load post for comment edge id" 200 "$status"
post_id="$(post_id_by_content "$content")"

status="$(request_json POST "/api/posts/$post_id/comments" '{"content":""}' "$author_cookie")"
assert_status "reject empty comment" 400 "$status"

status="$(request_get /api/posts/999999/comments "$author_cookie")"
assert_status "missing post comments return 404" 404 "$status"

status="$(request_get /api/posts/abc/comments "$author_cookie")"
assert_status "weird post id comments return bad request" 400 "$status"

echo "PASS: post_comments_edge.sh completed $pass_count checks against $BASE_URL"
