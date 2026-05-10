#!/usr/bin/env bash
set -euo pipefail

# Profile media uploads:
# - valid avatar and cover images are accepted and served back;
# - empty multipart and disguised non-image files are rejected.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

cookie_jar="$TMP_DIR/profile-media.cookies"
gif_file="$TMP_DIR/tiny.gif"
bad_file="$TMP_DIR/evil.jpg"
write_test_gif "$gif_file"
write_fake_pdf_jpg "$bad_file"

register_user "pu-user-${RUN_ID}@t.io" "Upload" "User" true "$cookie_jar" "Upload bio"

status="$(request_form POST /api/profile/avatar "$cookie_jar" -F "avatar=@$gif_file;filename=avatar.gif;type=image/gif")"
assert_status "upload valid avatar gif" 200 "$status"
avatar_url="$(json_string_field avatar)"
if [[ -z "$avatar_url" ]]; then
  echo "FAIL: could not extract avatar url" >&2
  cat "$LAST_BODY" >&2
  exit 1
fi

status="$(request_get "$avatar_url")"
assert_status "uploaded avatar is served statically" 200 "$status"

status="$(request_form POST /api/profile/cover "$cookie_jar" -F "cover=@$gif_file;filename=cover.gif;type=image/gif")"
assert_status "upload valid cover gif" 200 "$status"
cover_url="$(json_string_field cover)"
if [[ -z "$cover_url" ]]; then
  echo "FAIL: could not extract cover url" >&2
  cat "$LAST_BODY" >&2
  exit 1
fi

status="$(request_get "$cover_url")"
assert_status "uploaded cover is served statically" 200 "$status"

status="$(request_form POST /api/profile/avatar "$cookie_jar" -F "avatar=@$bad_file;filename=evil.jpg;type=image/jpeg")"
assert_status "reject fake jpg avatar" 400 "$status"

status="$(request_form POST /api/profile/cover "$cookie_jar" -F "cover=@$bad_file;filename=evil.jpg;type=image/jpeg")"
assert_status "reject fake jpg cover" 400 "$status"

status="$(request_form POST /api/profile/avatar "$cookie_jar" -F "unused=value")"
assert_status "reject avatar upload without file" 400 "$status"

echo "PASS: profile_uploads.sh completed $pass_count checks against $BASE_URL"
