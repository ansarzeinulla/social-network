#!/usr/bin/env bash
set -euo pipefail

# Profile settings test:
# - successful public/private toggle both ways;
# - garbage privacy value is rejected.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

cookie_jar="$TMP_DIR/profile-edit.cookies"

register_user "pe-user-${RUN_ID}@t.io" "Profile" "Editor" true "$cookie_jar" "Profile edit bio"

status="$(request_get /api/profile "$cookie_jar")"
assert_status "profile starts public" 200 "$status"
assert_body_contains "initial privacy is public" "\"is_public\":true"

status="$(request_json POST /api/profile/privacy '{"is_public":false}' "$cookie_jar")"
assert_status "switch profile to private" 200 "$status"
assert_body_contains "privacy response is private" "\"is_public\":false"

status="$(request_get /api/profile "$cookie_jar")"
assert_status "profile loads after private toggle" 200 "$status"
assert_body_contains "profile is private after toggle" "\"is_public\":false"

status="$(request_json PATCH /api/profile/privacy '{"is_public":true}' "$cookie_jar")"
assert_status "switch profile back to public" 200 "$status"
assert_body_contains "privacy response is public" "\"is_public\":true"

status="$(request_get /api/profile "$cookie_jar")"
assert_status "profile loads after public toggle" 200 "$status"
assert_body_contains "profile is public after toggle" "\"is_public\":true"

status="$(request_json POST /api/profile/privacy '{"is_public":"SUPER_PRIVATE"}' "$cookie_jar")"
assert_status "reject garbage privacy status" 400 "$status"

echo "PASS: profile_edit.sh completed $pass_count checks against $BASE_URL"
