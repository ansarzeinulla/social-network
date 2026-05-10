#!/usr/bin/env bash
set -euo pipefail

# Post error handling:
# - missing post returns strict 404;
# - deleted post returns strict 404;
# - weird non-numeric id is rejected as a bad request.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

author_cookie="$TMP_DIR/author.cookies"

register_user "pe-author-${RUN_ID}@t.io" "Post" "Errors" true "$author_cookie" "Post errors bio"
author_id="$CREATED_USER_ID"

status="$(request_get /api/post?id=999999 "$author_cookie")"
assert_status "missing post returns 404" 404 "$status"

delete_content="post deleted edge ${RUN_ID}"
status="$(request_form POST /api/posts/create "$author_cookie" -F "content=$delete_content" -F "privacy=public")"
assert_status "create post before delete" 201 "$status"

status="$(request_get "/api/users/$author_id/posts" "$author_cookie")"
assert_status "load author posts before delete" 200 "$status"
delete_id="$(post_id_by_content "$delete_content")"
if [[ -z "$delete_id" ]]; then
  echo "FAIL: could not extract deleted-post id" >&2
  cat "$LAST_BODY" >&2
  exit 1
fi

status="$(request_delete "/api/posts/delete?id=$delete_id" "$author_cookie")"
assert_status "delete post" 200 "$status"

status="$(request_get "/api/post?id=$delete_id" "$author_cookie")"
assert_status "deleted post returns 404" 404 "$status"

status="$(request_get /api/post?id=abc "$author_cookie")"
assert_status "weird post id returns bad request" 400 "$status"

echo "PASS: post_404_edge.sh completed $pass_count checks against $BASE_URL"
