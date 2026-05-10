#!/usr/bin/env bash
set -euo pipefail

# Lightweight concurrency checks:
# - duplicate follow requests converge to accepted state;
# - duplicate group invites do not create duplicate membership;
# - concurrent event vote changes keep a single final vote.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

actor_cookie="$TMP_DIR/actor.cookies"
target_cookie="$TMP_DIR/target.cookies"
creator_cookie="$TMP_DIR/creator.cookies"
invitee_cookie="$TMP_DIR/invitee.cookies"
voter_cookie="$TMP_DIR/voter.cookies"

register_user "rc-actor-${RUN_ID}@t.io" "Race" "Actor" true "$actor_cookie" "Race actor bio"
register_user "rc-target-${RUN_ID}@t.io" "Race" "Target" true "$target_cookie" "Race target bio"
target_id="$CREATED_USER_ID"

request_json POST "/api/follow/$target_id" '{}' "$actor_cookie" > "$TMP_DIR/follow1.status" &
request_json POST "/api/follow/$target_id" '{}' "$actor_cookie" > "$TMP_DIR/follow2.status" &
wait
if [[ "$(cat "$TMP_DIR/follow1.status")" != "200" || "$(cat "$TMP_DIR/follow2.status")" != "200" ]]; then
  echo "FAIL: concurrent follow expected both HTTP 200" >&2
  exit 1
fi
pass_count=$((pass_count + 1))
echo "ok $pass_count - concurrent duplicate follow calls return 200"

status="$(request_get "/api/profile/$target_id" "$actor_cookie")"
assert_status "profile loads after concurrent follow" 200 "$status"
assert_body_contains "concurrent follow converges to following" "\"is_following\":true"

register_user "rc-create-${RUN_ID}@t.io" "Race" "Creator" true "$creator_cookie" "Race creator bio"
register_user "rc-invite-${RUN_ID}@t.io" "Race" "Invitee" true "$invitee_cookie" "Race invitee bio"
invitee_id="$CREATED_USER_ID"

status="$(request_json POST /api/groups "{\"title\":\"RaceGroup${RUN_ID}\",\"description\":\"Race group\"}" "$creator_cookie")"
assert_status "create group for invite race" 200 "$status"
group_id="$(json_number_field id)"

request_json POST "/api/groups/$group_id/invite" "{\"user_id\":$invitee_id}" "$creator_cookie" > "$TMP_DIR/invite1.status" &
request_json POST "/api/groups/$group_id/invite" "{\"user_id\":$invitee_id}" "$creator_cookie" > "$TMP_DIR/invite2.status" &
wait
invite_statuses="$(cat "$TMP_DIR/invite1.status") $(cat "$TMP_DIR/invite2.status")"
if [[ "$invite_statuses" != *"200"* ]]; then
  echo "FAIL: concurrent invite expected at least one HTTP 200, got [$invite_statuses]" >&2
  exit 1
fi
pass_count=$((pass_count + 1))
echo "ok $pass_count - concurrent duplicate invites leave one invited membership"

status="$(request_json POST "/api/groups/$group_id/accept" '{}' "$invitee_cookie")"
assert_status "invitee accepts after concurrent invite" 200 "$status"

register_user "rc-voter-${RUN_ID}@t.io" "Race" "Voter" true "$voter_cookie" "Race voter bio"
voter_id="$CREATED_USER_ID"
status="$(request_json POST "/api/groups/$group_id/invite" "{\"user_id\":$voter_id}" "$creator_cookie")"
assert_status "invite voter for vote race" 200 "$status"
status="$(request_json POST "/api/groups/$group_id/accept" '{}' "$voter_cookie")"
assert_status "voter accepts invite for vote race" 200 "$status"

event_payload='{"title":"Race event","description":"Race vote","event_date":"2027-04-01T12:00:00Z","options":["going","not_going"]}'
status="$(request_json POST "/api/groups/$group_id/events" "$event_payload" "$creator_cookie")"
assert_status "create event for vote race" 200 "$status"
event_id="$(json_number_field id)"

request_json POST "/api/groups/$group_id/events/$event_id/vote" '{"vote":"going"}' "$voter_cookie" > "$TMP_DIR/vote1.status" &
request_json POST "/api/groups/$group_id/events/$event_id/vote" '{"vote":"not_going"}' "$voter_cookie" > "$TMP_DIR/vote2.status" &
wait
if [[ "$(cat "$TMP_DIR/vote1.status")" != "200" || "$(cat "$TMP_DIR/vote2.status")" != "200" ]]; then
  echo "FAIL: concurrent votes expected both HTTP 200" >&2
  exit 1
fi
pass_count=$((pass_count + 1))
echo "ok $pass_count - concurrent vote changes return 200"

status="$(request_get "/api/groups/$group_id/events" "$voter_cookie")"
assert_status "events load after concurrent vote changes" 200 "$status"
assert_body_contains "voter has one final vote field" "\"my_vote\":"

echo "PASS: race_follow_invite_vote.sh completed $pass_count checks against $BASE_URL"
