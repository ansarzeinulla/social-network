#!/usr/bin/env bash
set -euo pipefail

# Group content edge cases:
# - empty group posts/comments are rejected;
# - bad IDs return strict 400/404;
# - comments cannot be read through the wrong group path.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

creator_cookie="$TMP_DIR/creator.cookies"
member_cookie="$TMP_DIR/member.cookies"

register_user "gce-create-${RUN_ID}@t.io" "Edge" "Creator" true "$creator_cookie"
register_user "gce-member-${RUN_ID}@t.io" "Edge" "Member" true "$member_cookie"
member_id="$CREATED_USER_ID"

status="$(request_json POST /api/groups "{\"title\":\"GroupContentEdgeA${RUN_ID}\",\"description\":\"edge a\"}" "$creator_cookie")"
assert_status "create first group for content edge" 200 "$status"
group_a="$(json_number_field id)"

status="$(request_json POST /api/groups "{\"title\":\"GroupContentEdgeB${RUN_ID}\",\"description\":\"edge b\"}" "$creator_cookie")"
assert_status "create second group for content edge" 200 "$status"
group_b="$(json_number_field id)"

status="$(request_json POST "/api/groups/$group_a/invite" "{\"user_id\":$member_id}" "$creator_cookie")"
assert_status "invite member to first edge group" 200 "$status"
status="$(request_json POST "/api/groups/$group_a/accept" '{}' "$member_cookie")"
assert_status "member accepts first edge group" 200 "$status"

status="$(request_json POST "/api/groups/$group_a/posts" '{"content":""}' "$creator_cookie")"
assert_status "reject empty group post" 400 "$status"

post_content="group edge post ${RUN_ID}"
status="$(request_json POST "/api/groups/$group_a/posts" "{\"content\":\"$post_content\"}" "$creator_cookie")"
assert_status "create group post for content edge" 200 "$status"
post_id="$(json_number_field id)"

status="$(request_json POST "/api/groups/$group_a/posts/$post_id/comments" '{"content":""}' "$member_cookie")"
assert_status "reject empty group comment" 400 "$status"

status="$(request_get "/api/groups/$group_a/posts/abc/comments" "$creator_cookie")"
assert_status "weird group post id returns bad request" 400 "$status"

status="$(request_get "/api/groups/$group_a/posts/999999/comments" "$creator_cookie")"
assert_status "missing group post comments return not found" 404 "$status"

status="$(request_get "/api/groups/$group_b/posts/$post_id/comments" "$creator_cookie")"
assert_status "post from another group cannot be read through wrong group" 404 "$status"

echo "PASS: group_content_edge.sh completed $pass_count checks against $BASE_URL"
