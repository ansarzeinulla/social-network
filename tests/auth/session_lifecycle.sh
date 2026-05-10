#!/usr/bin/env bash
set -euo pipefail

# Session lifecycle:
# - a fresh login invalidates the previous session for the same user;
# - logout invalidates the active session.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

email="asl-user-${RUN_ID}@t.io"
password="Test123!"
first_cookie="$TMP_DIR/first.cookies"
second_cookie="$TMP_DIR/second.cookies"

payload=$(printf '{"email":"%s","password":"%s","first_name":"Session","last_name":"Life","date_of_birth":"1995-05-15","is_public":true}' "$email" "$password")
status="$(request_json POST /api/register "$payload" "$first_cookie")"
assert_status "register session lifecycle user" 201 "$status"

status="$(request_get /api/profile "$first_cookie")"
assert_status "first session works after register" 200 "$status"

login_payload=$(printf '{"email":"%s","password":"%s"}' "$email" "$password")
status="$(request_json POST /api/login "$login_payload" "$second_cookie")"
assert_status "second login succeeds" 200 "$status"

status="$(request_get /api/profile "$first_cookie")"
assert_status "second login invalidates previous session" 401 "$status"

status="$(request_get /api/profile "$second_cookie")"
assert_status "new session remains valid" 200 "$status"

status="$(request_json POST /api/logout '{}' "$second_cookie")"
assert_status "logout active session" 200 "$status"

status="$(request_get /api/profile "$second_cookie")"
assert_status "logged out session is rejected" 401 "$status"

echo "PASS: session_lifecycle.sh completed $pass_count checks against $BASE_URL"
