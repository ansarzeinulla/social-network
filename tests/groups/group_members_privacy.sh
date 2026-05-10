#!/usr/bin/env bash
set -euo pipefail

# Group member privacy:
# - confirmed members can read group members;
# - outsiders cannot enumerate group members.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

creator_cookie="$TMP_DIR/creator.cookies"
member_cookie="$TMP_DIR/member.cookies"
outsider_cookie="$TMP_DIR/outsider.cookies"

register_user "gmp-create-${RUN_ID}@t.io" "Member" "Creator" true "$creator_cookie"
register_user "gmp-member-${RUN_ID}@t.io" "Member" "Inside" true "$member_cookie"
member_id="$CREATED_USER_ID"
register_user "gmp-out-${RUN_ID}@t.io" "Member" "Outside" true "$outsider_cookie"

status="$(request_json POST /api/groups "{\"title\":\"MembersPrivacy${RUN_ID}\",\"description\":\"private member list\"}" "$creator_cookie")"
assert_status "create group for member privacy" 200 "$status"
group_id="$(json_number_field id)"

status="$(request_json POST "/api/groups/$group_id/invite" "{\"user_id\":$member_id}" "$creator_cookie")"
assert_status "invite member for member privacy" 200 "$status"
status="$(request_json POST "/api/groups/$group_id/accept" '{}' "$member_cookie")"
assert_status "member accepts invite for member privacy" 200 "$status"

status="$(request_get "/api/groups/$group_id/members" "$member_cookie")"
assert_status "member can list group members" 200 "$status"
assert_body_contains "member list includes invited member" "Inside"

status="$(request_get "/api/groups/$group_id/members" "$outsider_cookie")"
assert_status "outsider cannot list group members" 403 "$status"

echo "PASS: group_members_privacy.sh completed $pass_count checks against $BASE_URL"
