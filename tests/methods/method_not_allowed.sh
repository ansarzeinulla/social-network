#!/usr/bin/env bash
set -euo pipefail

# Authenticated wrong-method checks for common endpoints.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

cookie_jar="$TMP_DIR/methods.cookies"
register_user "mn-user-${RUN_ID}@t.io" "Method" "Tester" true "$cookie_jar" "Method tester bio"

status="$(request_get /api/posts/create "$cookie_jar")"
assert_status "GET posts/create is method-not-allowed" 405 "$status"

status="$(request_json POST /api/posts '{}' "$cookie_jar")"
assert_status "POST posts feed is method-not-allowed" 405 "$status"

status="$(request_json PUT /api/chats '{}' "$cookie_jar")"
assert_status "PUT chats list is method-not-allowed" 405 "$status"

status="$(request_get /api/notifications/read-all "$cookie_jar")"
assert_status "GET notifications/read-all is method-not-allowed" 405 "$status"

status="$(request_get /api/follow/999999 "$cookie_jar")"
assert_status "GET follow target is method-not-allowed" 405 "$status"

status="$(request_delete /api/groups "$cookie_jar")"
assert_status "DELETE groups root is method-not-allowed" 405 "$status"

echo "PASS: method_not_allowed.sh completed $pass_count checks against $BASE_URL"
