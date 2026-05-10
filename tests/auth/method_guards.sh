#!/usr/bin/env bash
set -euo pipefail

# Auth/profile/post method guards:
# - auth endpoints reject wrong methods;
# - GET /api/logout must not destroy a session;
# - profile special paths and singular post lookup reject wrong methods.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

cookie_jar="$TMP_DIR/method-user.cookies"
register_user "amg-user-${RUN_ID}@t.io" "Method" "Guard" true "$cookie_jar" "Method guard bio"

status="$(request_get /api/register)"
assert_status "GET register is method-not-allowed" 405 "$status"

status="$(request_get /api/login)"
assert_status "GET login is method-not-allowed" 405 "$status"

status="$(request_get /api/logout "$cookie_jar")"
assert_status "GET logout is method-not-allowed" 405 "$status"

status="$(request_get /api/profile "$cookie_jar")"
assert_status "GET logout did not destroy session" 200 "$status"

status="$(request_json PUT /api/logout '{}' "$cookie_jar")"
assert_status "PUT logout is method-not-allowed" 405 "$status"

status="$(request_json PUT /api/profile '{"about_me":"bad"}' "$cookie_jar")"
assert_status "PUT profile is method-not-allowed" 405 "$status"

status="$(request_get /api/profile/avatar "$cookie_jar")"
assert_status "GET profile avatar endpoint is method-not-allowed" 405 "$status"

status="$(request_get /api/profile/cover "$cookie_jar")"
assert_status "GET profile cover endpoint is method-not-allowed" 405 "$status"

status="$(request_json POST /api/post '{}' "$cookie_jar")"
assert_status "POST singular post lookup is method-not-allowed" 405 "$status"

echo "PASS: method_guards.sh completed $pass_count checks against $BASE_URL"
