#!/usr/bin/env bash
set -euo pipefail

# Notification generation:
# - follow request;
# - group invite;
# - group join request;
# - new group event.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

count_type() {
  local type="$1"
  grep -o "\"type\":\"$type\"" "$LAST_BODY" | wc -l | tr -d ' '
}

actor_cookie="$TMP_DIR/actor.cookies"
follow_receiver_cookie="$TMP_DIR/follow-receiver.cookies"
creator_cookie="$TMP_DIR/group-creator.cookies"
invitee_cookie="$TMP_DIR/invitee.cookies"
requester_cookie="$TMP_DIR/requester.cookies"
event_receiver_cookie="$TMP_DIR/event-receiver.cookies"

register_user "nt-actor-${RUN_ID}@t.io" "Notif" "Actor" true "$actor_cookie" "Notif actor bio"
register_user "nt-follow-${RUN_ID}@t.io" "Notif" "FollowTarget" false "$follow_receiver_cookie" "Notif follow target bio"
follow_receiver_id="$CREATED_USER_ID"
register_user "nt-create-${RUN_ID}@t.io" "Notif" "Creator" true "$creator_cookie" "Notif creator bio"
register_user "nt-invite-${RUN_ID}@t.io" "Notif" "Invitee" true "$invitee_cookie" "Notif invitee bio"
invitee_id="$CREATED_USER_ID"
register_user "nt-req-${RUN_ID}@t.io" "Notif" "Requester" true "$requester_cookie" "Notif requester bio"
requester_id="$CREATED_USER_ID"
register_user "nt-event-${RUN_ID}@t.io" "Notif" "EventReceiver" true "$event_receiver_cookie" "Notif event receiver bio"
event_receiver_id="$CREATED_USER_ID"

status="$(request_json POST "/api/follow/$follow_receiver_id" '{}' "$actor_cookie")"
assert_status "trigger follow request notification" 200 "$status"
assert_body_contains "follow request is pending" "\"status\":\"pending\""

status="$(request_json POST /api/groups "{\"title\":\"NotifGroup${RUN_ID}\",\"description\":\"Notification triggers\"}" "$creator_cookie")"
assert_status "create group for notification triggers" 200 "$status"
group_id="$(json_number_field id)"

status="$(request_json POST "/api/groups/$group_id/invite" "{\"user_id\":$invitee_id}" "$creator_cookie")"
assert_status "trigger group invite notification" 200 "$status"

status="$(request_json POST "/api/groups/$group_id/join" '{}' "$requester_cookie")"
assert_status "trigger group request notification" 200 "$status"
assert_body_contains "group join request is requested" "\"status\":\"requested\""

status="$(request_json POST "/api/groups/$group_id/invite" "{\"user_id\":$event_receiver_id}" "$creator_cookie")"
assert_status "invite event notification receiver" 200 "$status"
status="$(request_json POST "/api/groups/$group_id/accept" '{}' "$event_receiver_cookie")"
assert_status "event notification receiver accepts invite" 200 "$status"

event_payload='{"title":"Notification event","description":"new_event trigger","event_date":"2027-03-01T12:00:00Z","options":["going","not_going"]}'
status="$(request_json POST "/api/groups/$group_id/events" "$event_payload" "$creator_cookie")"
assert_status "trigger new event notification" 200 "$status"

total_new=0

status="$(request_get /api/notifications "$follow_receiver_cookie")"
assert_status "follow receiver lists notifications" 200 "$status"
follow_count="$(count_type follow_request)"
if [[ "$follow_count" != "1" ]]; then
  echo "FAIL: expected exactly 1 follow_request notification, got $follow_count" >&2
  cat "$LAST_BODY" >&2
  exit 1
fi
total_new=$((total_new + follow_count))
assert_body_contains "follow receiver has follow_request notification" "\"type\":\"follow_request\""

status="$(request_get /api/notifications "$invitee_cookie")"
assert_status "invitee lists notifications" 200 "$status"
invite_count="$(count_type group_invite)"
if [[ "$invite_count" != "1" ]]; then
  echo "FAIL: expected exactly 1 group_invite notification, got $invite_count" >&2
  cat "$LAST_BODY" >&2
  exit 1
fi
total_new=$((total_new + invite_count))
assert_body_contains "invitee has group_invite notification" "\"type\":\"group_invite\""

status="$(request_get /api/notifications "$creator_cookie")"
assert_status "group creator lists notifications" 200 "$status"
request_count="$(count_type group_request)"
if [[ "$request_count" != "1" ]]; then
  echo "FAIL: expected exactly 1 group_request notification, got $request_count" >&2
  cat "$LAST_BODY" >&2
  exit 1
fi
total_new=$((total_new + request_count))
assert_body_contains "creator has group_request from requester" "\"sender_id\":$requester_id"

status="$(request_get /api/notifications "$event_receiver_cookie")"
assert_status "event receiver lists notifications" 200 "$status"
event_count="$(count_type new_event)"
if [[ "$event_count" != "1" ]]; then
  echo "FAIL: expected exactly 1 new_event notification, got $event_count" >&2
  cat "$LAST_BODY" >&2
  exit 1
fi
total_new=$((total_new + event_count))
assert_body_contains "event receiver has new_event notification" "\"type\":\"new_event\""

if [[ "$total_new" != "4" ]]; then
  echo "FAIL: expected exactly 4 new notifications across recipients, got $total_new" >&2
  exit 1
fi
pass_count=$((pass_count + 1))
echo "ok $pass_count - exactly four new notifications were generated"

echo "PASS: notif_triggers.sh completed $pass_count checks against $BASE_URL"
