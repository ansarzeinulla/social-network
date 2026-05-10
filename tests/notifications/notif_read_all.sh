#!/usr/bin/env bash
set -euo pipefail

# Notification read-all:
# - read-all marks all caller notifications;
# - it does not mark another user's notifications.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

actor_cookie="$TMP_DIR/actor.cookies"
receiver_cookie="$TMP_DIR/receiver.cookies"
other_cookie="$TMP_DIR/other.cookies"

register_user "nra-actor-${RUN_ID}@t.io" "ReadAll" "Actor" true "$actor_cookie" "Read all actor bio"
register_user "nra-recv-${RUN_ID}@t.io" "ReadAll" "Receiver" false "$receiver_cookie" "Read all receiver bio"
receiver_id="$CREATED_USER_ID"
register_user "nra-other-${RUN_ID}@t.io" "ReadAll" "Other" false "$other_cookie" "Read all other bio"
other_id="$CREATED_USER_ID"

status="$(request_json POST "/api/follow/$receiver_id" '{}' "$actor_cookie")"
assert_status "trigger first receiver notification" 200 "$status"
status="$(request_json POST "/api/follow/$receiver_id" '{}' "$other_cookie")"
assert_status "trigger second receiver notification" 200 "$status"
status="$(request_json POST "/api/follow/$other_id" '{}' "$actor_cookie")"
assert_status "trigger other user notification" 200 "$status"

status="$(request_get /api/notifications "$receiver_cookie")"
assert_status "receiver lists notifications before read-all" 200 "$status"
assert_body_contains "receiver has unread notifications before read-all" "\"is_read\":false"

status="$(request_json POST /api/notifications/read-all '{}' "$receiver_cookie")"
assert_status "mark all receiver notifications read" 200 "$status"

status="$(request_get /api/notifications "$receiver_cookie")"
assert_status "receiver lists notifications after read-all" 200 "$status"
assert_body_not_contains "receiver has no unread notifications after read-all" "\"is_read\":false"

status="$(request_get /api/notifications "$other_cookie")"
assert_status "other user lists notifications after receiver read-all" 200 "$status"
assert_body_contains "other user's notification remains unread" "\"is_read\":false"

echo "PASS: notif_read_all.sh completed $pass_count checks against $BASE_URL"
