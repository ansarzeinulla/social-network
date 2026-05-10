#!/usr/bin/env bash
set -euo pipefail

# Groups: content isolation.
# - group member creates post and comment;
# - non-member cannot read group posts or comment by direct URL.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

creator_cookie="$TMP_DIR/creator.cookies"
member_cookie="$TMP_DIR/member.cookies"
outsider_cookie="$TMP_DIR/outsider.cookies"

register_user "gct-create-${RUN_ID}@t.io" "Content" "Creator" true "$creator_cookie" "Content creator bio"
register_user "gct-member-${RUN_ID}@t.io" "Content" "Member" true "$member_cookie" "Content member bio"
member_id="$CREATED_USER_ID"
register_user "gct-out-${RUN_ID}@t.io" "Content" "Outsider" true "$outsider_cookie" "Content outsider bio"

title="GroupContent${RUN_ID}"
status="$(request_json POST /api/groups "{\"title\":\"$title\",\"description\":\"Content flow\"}" "$creator_cookie")"
assert_status "create content test group" 200 "$status"
group_id="$(json_number_field id)"

status="$(request_json POST "/api/groups/$group_id/invite" "{\"user_id\":$member_id}" "$creator_cookie")"
assert_status "creator invites content member" 200 "$status"
status="$(request_json POST "/api/groups/$group_id/accept" '{}' "$member_cookie")"
assert_status "content member accepts invite" 200 "$status"

post_content="group post ${RUN_ID}"
status="$(request_json POST "/api/groups/$group_id/posts" "{\"content\":\"$post_content\",\"image_url\":\"/uploads/group.gif\"}" "$creator_cookie")"
assert_status "member creates group post" 200 "$status"
group_post_id="$(json_number_field id)"
if [[ -z "$group_post_id" ]]; then
  echo "FAIL: could not extract group post id" >&2
  cat "$LAST_BODY" >&2
  exit 1
fi

comment_content="group comment ${RUN_ID}"
status="$(request_json POST "/api/groups/$group_id/posts/$group_post_id/comments" "{\"content\":\"$comment_content\"}" "$member_cookie")"
assert_status "member comments on group post" 200 "$status"
assert_body_contains "group comment returns id" "\"id\":"

status="$(request_get "/api/groups/$group_id/posts" "$member_cookie")"
assert_status "member reads group posts" 200 "$status"
assert_body_contains "group posts include created post" "$post_content"

status="$(request_get "/api/groups/$group_id/posts/$group_post_id/comments" "$member_cookie")"
assert_status "member reads group comments" 200 "$status"
assert_body_contains "group comments include created comment" "$comment_content"

status="$(request_get "/api/groups/$group_id/posts" "$outsider_cookie")"
assert_status "non-member cannot read group posts by direct URL" 403 "$status"

status="$(request_json POST "/api/groups/$group_id/posts/$group_post_id/comments" "{\"content\":\"outsider comment ${RUN_ID}\"}" "$outsider_cookie")"
assert_status "non-member cannot comment by direct URL" 403 "$status"

echo "PASS: group_content.sh completed $pass_count checks against $BASE_URL"
