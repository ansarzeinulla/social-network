#!/usr/bin/env bash
set -euo pipefail

# Group events: voting and vote validation.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

creator_cookie="$TMP_DIR/creator.cookies"
member_cookie="$TMP_DIR/member.cookies"
outsider_cookie="$TMP_DIR/outsider.cookies"

register_user "ev-create-${RUN_ID}@t.io" "Vote" "Creator" true "$creator_cookie" "Vote creator bio"
register_user "ev-member-${RUN_ID}@t.io" "Vote" "Member" true "$member_cookie" "Vote member bio"
member_id="$CREATED_USER_ID"
register_user "ev-out-${RUN_ID}@t.io" "Vote" "Outsider" true "$outsider_cookie" "Vote outsider bio"

status="$(request_json POST /api/groups "{\"title\":\"EventVote${RUN_ID}\",\"description\":\"Event vote flow\"}" "$creator_cookie")"
assert_status "create group for event voting" 200 "$status"
group_id="$(json_number_field id)"

status="$(request_json POST "/api/groups/$group_id/invite" "{\"user_id\":$member_id}" "$creator_cookie")"
assert_status "invite voting member" 200 "$status"
status="$(request_json POST "/api/groups/$group_id/accept" '{}' "$member_cookie")"
assert_status "voting member accepts invite" 200 "$status"

event_title="Vote meetup ${RUN_ID}"
event_payload=$(printf '{"title":"%s","description":"Vote flow","event_date":"2027-02-01T12:00:00Z","options":["going","not_going"]}' "$event_title")
status="$(request_json POST "/api/groups/$group_id/events" "$event_payload" "$creator_cookie")"
assert_status "create event before voting" 200 "$status"
event_id="$(json_number_field id)"

status="$(request_json POST "/api/groups/$group_id/events/$event_id/vote" '{"vote":"going"}' "$member_cookie")"
assert_status "member votes going" 200 "$status"
assert_body_contains "going vote response" "\"vote\":\"going\""

status="$(request_get "/api/groups/$group_id/events" "$member_cookie")"
assert_status "member lists events after going vote" 200 "$status"
assert_body_contains "event list records going vote" "\"my_vote\":\"going\""

status="$(request_json POST "/api/groups/$group_id/events/$event_id/vote" '{"vote":"not_going"}' "$member_cookie")"
assert_status "member changes vote to not_going" 200 "$status"
assert_body_contains "changed vote response" "\"vote\":\"not_going\""

status="$(request_get "/api/groups/$group_id/events" "$member_cookie")"
assert_status "member lists events after changed vote" 200 "$status"
assert_body_contains "event list records changed vote" "\"my_vote\":\"not_going\""

status="$(request_json POST "/api/groups/$group_id/events/$event_id/vote" '{"vote":"maybe"}' "$member_cookie")"
assert_status "reject vote for missing option" 400 "$status"

status="$(request_json POST "/api/groups/$group_id/events/$event_id/vote" '{"vote":"going"}' "$outsider_cookie")"
assert_status "reject event vote by non-member" 403 "$status"

echo "PASS: group_event_vote.sh completed $pass_count checks against $BASE_URL"
