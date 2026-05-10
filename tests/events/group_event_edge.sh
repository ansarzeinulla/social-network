#!/usr/bin/env bash
set -euo pipefail

# Group event edge cases.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

creator_cookie="$TMP_DIR/creator.cookies"
member_cookie="$TMP_DIR/member.cookies"
outsider_cookie="$TMP_DIR/outsider.cookies"

register_user "eee-create-${RUN_ID}@t.io" "Event" "EdgeCreator" true "$creator_cookie" "Event edge creator bio"
register_user "eee-member-${RUN_ID}@t.io" "Event" "EdgeMember" true "$member_cookie" "Event edge member bio"
member_id="$CREATED_USER_ID"
register_user "eee-out-${RUN_ID}@t.io" "Event" "EdgeOut" true "$outsider_cookie" "Event edge out bio"

status="$(request_json POST /api/groups "{\"title\":\"EventEdge${RUN_ID}\",\"description\":\"Event edge\"}" "$creator_cookie")"
assert_status "create group for event edge tests" 200 "$status"
group_id="$(json_number_field id)"
status="$(request_json POST "/api/groups/$group_id/invite" "{\"user_id\":$member_id}" "$creator_cookie")"
assert_status "invite member for event edge tests" 200 "$status"
status="$(request_json POST "/api/groups/$group_id/accept" '{}' "$member_cookie")"
assert_status "member accepts event edge invite" 200 "$status"

status="$(request_get "/api/groups/$group_id/events" "$outsider_cookie")"
assert_status "non-member cannot list group events" 403 "$status"

status="$(request_json POST "/api/groups/$group_id/events" '{"title":"","description":"bad","event_date":"2027-01-01T12:00:00Z","options":["going","not_going"]}' "$creator_cookie")"
assert_status "reject event without title" 400 "$status"

status="$(request_json POST "/api/groups/$group_id/events" '{"title":"Bad date","description":"bad","event_date":"not-a-date","options":["going","not_going"]}' "$creator_cookie")"
assert_status "reject invalid event date format" 400 "$status"

status="$(request_json POST "/api/groups/$group_id/events" '{"title":"Bad options","description":"bad","event_date":"2027-01-01T12:00:00Z","options":["going"]}' "$creator_cookie")"
assert_status "reject event with less than two options" 400 "$status"

status="$(request_json POST "/api/groups/$group_id/events" '{"title":"Bad option","description":"bad","event_date":"2027-01-01T12:00:00Z","options":["going","maybe"]}' "$creator_cookie")"
assert_status "reject event with unknown option" 400 "$status"

status="$(request_json POST "/api/groups/$group_id/events" '{"title":"Good edge event","description":"ok","event_date":"2027-01-01T12:00:00Z","options":["going","not_going"]}' "$creator_cookie")"
assert_status "create valid event for vote edge" 200 "$status"
event_id="$(json_number_field id)"

status="$(request_json POST "/api/groups/$group_id/events/999999/vote" '{"vote":"going"}' "$member_cookie")"
assert_status "vote on missing event returns 404" 404 "$status"

status="$(request_json POST /api/groups "{\"title\":\"OtherEventGroup${RUN_ID}\",\"description\":\"Other group\"}" "$creator_cookie")"
assert_status "create second group for event url mismatch" 200 "$status"
other_group_id="$(json_number_field id)"

status="$(request_json POST "/api/groups/$other_group_id/events/$event_id/vote" '{"vote":"going"}' "$creator_cookie")"
assert_status "event id from another group returns 404" 404 "$status"

echo "PASS: group_event_edge.sh completed $pass_count checks against $BASE_URL"
