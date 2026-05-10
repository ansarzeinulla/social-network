#!/usr/bin/env bash
set -euo pipefail

# Notification interactions:
# - list notifications;
# - mark own notification as read;
# - cannot mark another user's notification as read.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

notification_id_by_type() {
  local type="$1"
  tr '{' '\n' < "$LAST_BODY" |
    grep -F "\"type\":\"$type\"" |
    sed -nE 's/.*"id":[[:space:]]*([0-9]+).*/\1/p' |
    head -n 1
}

actor_cookie="$TMP_DIR/actor.cookies"
receiver_cookie="$TMP_DIR/receiver.cookies"
other_cookie="$TMP_DIR/other.cookies"

register_user "nr-actor-${RUN_ID}@t.io" "Notif" "ReaderActor" true "$actor_cookie" "Notif reader actor bio"
register_user "nr-recv-${RUN_ID}@t.io" "Notif" "Reader" false "$receiver_cookie" "Notif reader bio"
receiver_id="$CREATED_USER_ID"
register_user "nr-other-${RUN_ID}@t.io" "Notif" "Other" false "$other_cookie" "Notif other bio"
other_id="$CREATED_USER_ID"

status="$(request_json POST "/api/follow/$receiver_id" '{}' "$actor_cookie")"
assert_status "trigger receiver notification" 200 "$status"
status="$(request_json POST "/api/follow/$other_id" '{}' "$actor_cookie")"
assert_status "trigger other user's notification" 200 "$status"

status="$(request_get /api/notifications "$receiver_cookie")"
assert_status "receiver lists notifications" 200 "$status"
assert_body_contains "receiver notification is initially unread" "\"is_read\":false"
own_notification_id="$(notification_id_by_type follow_request)"
if [[ -z "$own_notification_id" ]]; then
  echo "FAIL: could not extract receiver notification id" >&2
  cat "$LAST_BODY" >&2
  exit 1
fi

status="$(request_json POST "/api/notifications/$own_notification_id/read" '{}' "$receiver_cookie")"
assert_status "mark own notification read" 200 "$status"
assert_body_contains "mark read response is ok" "\"status\":\"ok\""

status="$(request_get /api/notifications "$receiver_cookie")"
assert_status "receiver lists notifications after mark read" 200 "$status"
assert_body_contains "receiver notification is now read" "\"is_read\":true"

status="$(request_get /api/notifications "$other_cookie")"
assert_status "other user lists notifications" 200 "$status"
other_notification_id="$(notification_id_by_type follow_request)"
if [[ -z "$other_notification_id" ]]; then
  echo "FAIL: could not extract other user's notification id" >&2
  cat "$LAST_BODY" >&2
  exit 1
fi

status="$(request_json POST "/api/notifications/$other_notification_id/read" '{}' "$receiver_cookie")"
assert_status "reject marking another user's notification read" 404 "$status"

echo "PASS: notif_read.sh completed $pass_count checks against $BASE_URL"
