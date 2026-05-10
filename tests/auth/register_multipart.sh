#!/usr/bin/env bash
set -euo pipefail

# Multipart registration:
# - accepts a valid avatar upload during registration;
# - serves the uploaded avatar;
# - rejects a disguised non-image avatar.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

gif_file="$TMP_DIR/avatar.gif"
bad_file="$TMP_DIR/evil.jpg"
cookie_jar="$TMP_DIR/multipart.cookies"
write_test_gif "$gif_file"
write_fake_pdf_jpg "$bad_file"

email="arm-user-${RUN_ID}@t.io"
status="$(curl -sS -X POST "$BASE_URL/api/register" \
  -F "email=$email" \
  -F "password=Test123!" \
  -F "first_name=Multipart" \
  -F "last_name=Avatar" \
  -F "date_of_birth=1995-05-15" \
  -F "nickname=multi${RUN_ID}" \
  -F "about_me=Multipart registration" \
  -F "is_public=true" \
  -F "avatar=@$gif_file;filename=avatar.gif;type=image/gif" \
  -c "$cookie_jar" \
  -b "$cookie_jar" \
  -o "$LAST_BODY" \
  -w "%{http_code}")"
assert_status "register with multipart avatar" 201 "$status"

status="$(request_get /api/profile "$cookie_jar")"
assert_status "multipart registered user can load profile" 200 "$status"
avatar_url="$(json_string_field avatar)"
if [[ -z "$avatar_url" ]]; then
  echo "FAIL: multipart registration did not return avatar on profile" >&2
  cat "$LAST_BODY" >&2
  exit 1
fi
pass_count=$((pass_count + 1))
echo "ok $pass_count - multipart profile has avatar URL"

status="$(request_get "$avatar_url" "$cookie_jar")"
assert_status "multipart avatar is served statically" 200 "$status"

bad_email="arm-bad-${RUN_ID}@t.io"
status="$(curl -sS -X POST "$BASE_URL/api/register" \
  -F "email=$bad_email" \
  -F "password=Test123!" \
  -F "first_name=Multipart" \
  -F "last_name=Bad" \
  -F "date_of_birth=1995-05-15" \
  -F "is_public=true" \
  -F "avatar=@$bad_file;filename=evil.jpg;type=image/jpeg" \
  -o "$LAST_BODY" \
  -w "%{http_code}")"
assert_status "reject bad multipart registration avatar" 400 "$status"

echo "PASS: register_multipart.sh completed $pass_count checks against $BASE_URL"
