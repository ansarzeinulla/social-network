#!/usr/bin/env bash
set -euo pipefail

# Comments:
# - successful text comment;
# - successful comment with GIF URL;
# - forbidden user cannot comment under a private post they cannot see.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

author_cookie="$TMP_DIR/author.cookies"
viewer_cookie="$TMP_DIR/viewer.cookies"
stranger_cookie="$TMP_DIR/stranger.cookies"

register_user "pm-author-${RUN_ID}@t.io" "Comment" "Author" true "$author_cookie" "Comment author bio"
author_id="$CREATED_USER_ID"
register_user "pm-viewer-${RUN_ID}@t.io" "Comment" "Viewer" true "$viewer_cookie" "Comment viewer bio"
viewer_id="$CREATED_USER_ID"
register_user "pm-strange-${RUN_ID}@t.io" "Comment" "Stranger" true "$stranger_cookie" "Comment stranger bio"

status="$(request_json POST "/api/follow/$author_id" '{}' "$viewer_cookie")"
assert_status "viewer follows author for private viewer selection" 200 "$status"
assert_body_contains "viewer follow accepted" "\"status\":\"accepted\""

public_content="comment public post ${RUN_ID}"
private_content="comment private post ${RUN_ID}"
status="$(request_form POST /api/posts/create "$author_cookie" -F "content=$public_content" -F "privacy=public")"
assert_status "create public post for comments" 201 "$status"
status="$(request_form POST /api/posts/create "$author_cookie" -F "content=$private_content" -F "privacy=private" -F "viewers=$viewer_id")"
assert_status "create private post for comment privacy" 201 "$status"

status="$(request_get "/api/users/$author_id/posts" "$author_cookie")"
assert_status "load author posts for comment ids" 200 "$status"
public_id="$(post_id_by_content "$public_content")"
private_id="$(post_id_by_content "$private_content")"
if [[ -z "$public_id" || -z "$private_id" ]]; then
  echo "FAIL: could not extract comment test post ids" >&2
  cat "$LAST_BODY" >&2
  exit 1
fi

text_comment="plain comment ${RUN_ID}"
status="$(request_json POST "/api/posts/$public_id/comments" "{\"content\":\"$text_comment\"}" "$viewer_cookie")"
assert_status "create text comment" 200 "$status"
assert_body_contains "text comment returns id" "\"id\":"

gif_comment="gif comment ${RUN_ID}"
status="$(request_json POST "/api/posts/$public_id/comments" "{\"content\":\"$gif_comment\",\"image_url\":\"/uploads/test.gif\"}" "$viewer_cookie")"
assert_status "create comment with gif url" 200 "$status"
assert_body_contains "gif comment returns id" "\"id\":"

status="$(request_get "/api/posts/$public_id/comments" "$viewer_cookie")"
assert_status "load public post comments" 200 "$status"
assert_body_contains "comments include text comment" "$text_comment"
assert_body_contains "comments include gif comment" "$gif_comment"
assert_body_contains "comments include gif url" "/uploads/test.gif"

status="$(request_json POST "/api/posts/$private_id/comments" "{\"content\":\"forbidden comment ${RUN_ID}\"}" "$stranger_cookie")"
assert_status "reject comment under invisible private post" 403 "$status"

echo "PASS: post_comments.sh completed $pass_count checks against $BASE_URL"
