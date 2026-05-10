#!/usr/bin/env bash
set -euo pipefail

# Groups: creation and search/listing.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

creator_cookie="$TMP_DIR/creator.cookies"
register_user "gc-user-${RUN_ID}@t.io" "Group" "Creator" true "$creator_cookie" "Group creator bio"

title="GroupCreate${RUN_ID}"
description="Group create search description ${RUN_ID}"
payload=$(printf '{"title":"%s","description":"%s"}' "$title" "$description")
status="$(request_json POST /api/groups "$payload" "$creator_cookie")"
assert_status "create group with title and description" 200 "$status"
group_id="$(json_number_field id)"
if [[ -z "$group_id" ]]; then
  echo "FAIL: could not extract created group id" >&2
  cat "$LAST_BODY" >&2
  exit 1
fi

status="$(request_get "/api/groups?search=$title" "$creator_cookie")"
assert_status "search created group by title" 200 "$status"
assert_body_contains "search result includes group title" "$title"
assert_body_contains "search result includes group description" "$description"

status="$(request_get "/api/groups?search=%25_" "$creator_cookie")"
assert_status "special characters in search are safe" 200 "$status"

status="$(request_json POST /api/groups '{"title":"","description":"No title"}' "$creator_cookie")"
assert_status "reject group without title" 400 "$status"

echo "PASS: group_create_search.sh completed $pass_count checks against $BASE_URL"
