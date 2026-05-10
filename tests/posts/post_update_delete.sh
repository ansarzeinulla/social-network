#!/usr/bin/env bash
set -euo pipefail

# Post update/delete:
# - author updates content/privacy/image;
# - invalid update inputs and unauthorized update/delete are rejected;
# - delete handles invalid, missing, repeated ids.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

author_cookie="$TMP_DIR/author.cookies"
viewer_cookie="$TMP_DIR/viewer.cookies"
other_cookie="$TMP_DIR/other.cookies"
gif_file="$TMP_DIR/tiny.gif"
bad_file="$TMP_DIR/evil.jpg"
write_test_gif "$gif_file"
write_fake_pdf_jpg "$bad_file"

register_user "pud-author-${RUN_ID}@t.io" "Post" "Updater" true "$author_cookie" "Post updater bio"
author_id="$CREATED_USER_ID"
register_user "pud-view-${RUN_ID}@t.io" "Post" "Viewer" true "$viewer_cookie" "Post viewer bio"
viewer_id="$CREATED_USER_ID"
register_user "pud-other-${RUN_ID}@t.io" "Post" "Other" true "$other_cookie" "Post other bio"

status="$(request_json POST "/api/follow/$author_id" '{}' "$viewer_cookie")"
assert_status "viewer follows author for private viewer update" 200 "$status"

original_content="update delete original ${RUN_ID}"
updated_content="update delete changed ${RUN_ID}"
status="$(request_form POST /api/posts/create "$author_cookie" -F "content=$original_content" -F "privacy=public")"
assert_status "create post before update" 201 "$status"

status="$(request_get "/api/users/$author_id/posts" "$author_cookie")"
assert_status "load author posts before update" 200 "$status"
post_id="$(post_id_by_content "$original_content")"
if [[ -z "$post_id" ]]; then
  echo "FAIL: could not extract post id before update" >&2
  cat "$LAST_BODY" >&2
  exit 1
fi

status="$(request_form POST /api/posts/update "$author_cookie" \
  -F "id=$post_id" \
  -F "content=$updated_content" \
  -F "privacy=private" \
  -F "viewers=$viewer_id" \
  -F "image=@$gif_file;filename=updated.gif;type=image/gif")"
assert_status "author updates post content privacy and image" 200 "$status"

status="$(request_get "/api/post?id=$post_id" "$viewer_cookie")"
assert_status "selected viewer can read updated private post" 200 "$status"
assert_body_contains "updated post has new content" "$updated_content"
assert_body_contains "updated post has gif image" ".gif"

status="$(request_form POST /api/posts/update "$other_cookie" -F "id=$post_id" -F "content=hacked" -F "privacy=public")"
assert_status "reject update by non-author" 401 "$status"

status="$(request_form POST /api/posts/update "$author_cookie" -F "id=$post_id" -F "content=bad privacy" -F "privacy=SUPER_PRIVATE")"
assert_status "reject update with invalid privacy" 400 "$status"

status="$(request_form POST /api/posts/update "$author_cookie" -F "id=$post_id" -F "content=bad viewer" -F "privacy=private" -F "viewers=999999")"
assert_status "reject private update with invalid viewer" 400 "$status"

status="$(request_form POST /api/posts/update "$author_cookie" -F "id=$post_id" -F "content=bad image" -F "privacy=public" -F "image=@$bad_file;filename=evil.jpg;type=image/jpeg")"
assert_status "reject update with fake jpg" 400 "$status"

status="$(request_delete "/api/posts/delete?id=$post_id" "$other_cookie")"
assert_status "reject delete by non-author" 401 "$status"

status="$(request_delete "/api/posts/delete?id=abc" "$author_cookie")"
assert_status "reject delete with weird id" 400 "$status"

status="$(request_delete "/api/posts/delete" "$author_cookie")"
assert_status "reject delete without id" 400 "$status"

status="$(request_delete "/api/posts/delete?id=$post_id" "$author_cookie")"
assert_status "author deletes post" 200 "$status"

status="$(request_delete "/api/posts/delete?id=$post_id" "$author_cookie")"
assert_status "deleted post cannot be deleted twice" 404 "$status"

echo "PASS: post_update_delete.sh completed $pass_count checks against $BASE_URL"
