#!/usr/bin/env bash
set -euo pipefail

# Post creation:
# - text-only post;
# - text + GIF upload through multipart/form-data;
# - empty post rejection;
# - forbidden file content disguised as .jpg rejection.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

author_cookie="$TMP_DIR/author.cookies"
gif_file="$TMP_DIR/tiny.gif"
bad_file="$TMP_DIR/evil.jpg"
write_test_gif "$gif_file"
write_fake_pdf_jpg "$bad_file"

register_user "pc-author-${RUN_ID}@t.io" "Post" "Creator" true "$author_cookie" "Post creator bio"
author_id="$CREATED_USER_ID"

text_content="post create text only ${RUN_ID}"
status="$(request_form POST /api/posts/create "$author_cookie" \
  -F "content=$text_content" \
  -F "privacy=public")"
assert_status "create text-only post" 201 "$status"

status="$(request_get "/api/users/$author_id/posts" "$author_cookie")"
assert_status "load author posts after text create" 200 "$status"
assert_body_contains "text-only post is present" "$text_content"

gif_content="post create text gif ${RUN_ID}"
status="$(request_form POST /api/posts/create "$author_cookie" \
  -F "content=$gif_content" \
  -F "privacy=public" \
  -F "image=@$gif_file;filename=tiny.gif;type=image/gif")"
assert_status "create post with gif image" 201 "$status"

status="$(request_get "/api/users/$author_id/posts" "$author_cookie")"
assert_status "load author posts after gif create" 200 "$status"
assert_body_contains "gif post is present" "$gif_content"
assert_body_contains "gif post has uploaded gif url" ".gif"

status="$(request_form POST /api/posts/create "$author_cookie" \
  -F "content=" \
  -F "privacy=public")"
assert_status "reject empty post without text and image" 400 "$status"

status="$(request_form POST /api/posts/create "$author_cookie" \
  -F "content=bad file post ${RUN_ID}" \
  -F "privacy=public" \
  -F "image=@$bad_file;filename=evil.jpg;type=image/jpeg")"
assert_status "reject forbidden file disguised as jpg" 400 "$status"

echo "PASS: post_create.sh completed $pass_count checks against $BASE_URL"
