#!/usr/bin/env bash
set -euo pipefail

# Group events: creation and permission/date validation.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

creator_cookie="$TMP_DIR/creator.cookies"
outsider_cookie="$TMP_DIR/outsider.cookies"

register_user "ec-create-${RUN_ID}@t.io" "Event" "Creator" true "$creator_cookie" "Event creator bio"
register_user "ec-out-${RUN_ID}@t.io" "Event" "Outsider" true "$outsider_cookie" "Event outsider bio"

group_title="EventCreate${RUN_ID}"
status="$(request_json POST /api/groups "{\"title\":\"$group_title\",\"description\":\"Events create flow\"}" "$creator_cookie")"
assert_status "create group for event creation" 200 "$status"
group_id="$(json_number_field id)"

event_title="Launch meetup ${RUN_ID}"
event_payload=$(printf '{"title":"%s","description":"Going or not going","event_date":"2027-01-01T12:00:00Z","options":["going","not_going"]}' "$event_title")
status="$(request_json POST "/api/groups/$group_id/events" "$event_payload" "$creator_cookie")"
assert_status "create group event with going and not_going options" 200 "$status"
event_id="$(json_number_field id)"
if [[ -z "$event_id" ]]; then
  echo "FAIL: could not extract event id" >&2
  cat "$LAST_BODY" >&2
  exit 1
fi
assert_body_contains "event create response includes going option" "going"
assert_body_contains "event create response includes not_going option" "not_going"

status="$(request_get "/api/groups/$group_id/events" "$creator_cookie")"
assert_status "list group events after create" 200 "$status"
assert_body_contains "events list includes created title" "$event_title"

past_payload='{"title":"Past event","description":"Should fail","event_date":"2000-01-01T12:00:00Z","options":["going","not_going"]}'
status="$(request_json POST "/api/groups/$group_id/events" "$past_payload" "$creator_cookie")"
assert_status "reject event date in the past" 400 "$status"

outsider_payload='{"title":"Outsider event","description":"Should fail","event_date":"2027-01-02T12:00:00Z","options":["going","not_going"]}'
status="$(request_json POST "/api/groups/$group_id/events" "$outsider_payload" "$outsider_cookie")"
assert_status "reject event creation by non-member" 403 "$status"

echo "PASS: group_event_create.sh completed $pass_count checks against $BASE_URL"
