#!/usr/bin/env bash
set -euo pipefail

# Feed filter validation edge cases.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

cookie_jar="$TMP_DIR/filter-edge.cookies"
register_user "pfe-user-${RUN_ID}@t.io" "Filter" "Edge" true "$cookie_jar" "Filter edge bio"

status="$(request_get "/api/posts?page=abc" "$cookie_jar")"
assert_status "reject non-numeric page" 400 "$status"

status="$(request_get "/api/posts?page=1&privacy=SUPER_PRIVATE" "$cookie_jar")"
assert_status "reject invalid privacy filter" 400 "$status"

status="$(request_get "/api/posts?page=1&startDate=not-a-date" "$cookie_jar")"
assert_status "reject invalid start date" 400 "$status"

long_filter="$(printf 'x%.0s' {1..101})"
status="$(request_get "/api/posts?page=1&content=$long_filter" "$cookie_jar")"
assert_status "reject too-long content filter" 400 "$status"

echo "PASS: post_filter_edge.sh completed $pass_count checks against $BASE_URL"
