#!/usr/bin/env bash
set -euo pipefail

# Realtime notifications:
# - group invitations are delivered over websocket as notification.new.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

wait_ready() {
  local file="$1"
  for _ in {1..50}; do
    [[ -f "$file" ]] && return 0
    sleep 0.1
  done
  echo "FAIL: notification websocket listener did not become ready" >&2
  exit 1
}

creator_cookie="$TMP_DIR/creator.cookies"
invitee_cookie="$TMP_DIR/invitee.cookies"

register_user "nws-create-${RUN_ID}@t.io" "Notif" "Creator" true "$creator_cookie"
register_user "nws-invitee-${RUN_ID}@t.io" "Notif" "Invitee" true "$invitee_cookie"
invitee_id="$CREATED_USER_ID"

status="$(request_json POST /api/groups "{\"title\":\"NotifWs${RUN_ID}\",\"description\":\"ws notif\"}" "$creator_cookie")"
assert_status "create group for realtime notification" 200 "$status"
group_id="$(json_number_field id)"

ready="$TMP_DIR/notif.ready"
(
  cd "$SCRIPT_DIR/../../backend"
  go run ../tests/ws_client.go -base "$BASE_URL" -cookie "$invitee_cookie" -mode listen -expect notification.new -ready "$ready" -timeout 6s > "$TMP_DIR/notif.out"
) &
listener_pid=$!
wait_ready "$ready"

status="$(request_json POST "/api/groups/$group_id/invite" "{\"user_id\":$invitee_id}" "$creator_cookie")"
assert_status "group invite triggers realtime notification" 200 "$status"

wait "$listener_pid"
if ! grep -Fq "notification.new" "$TMP_DIR/notif.out"; then
  echo "FAIL: invitee did not receive notification.new" >&2
  cat "$TMP_DIR/notif.out" >&2
  exit 1
fi
pass_count=$((pass_count + 1))
echo "ok $pass_count - invitee receives realtime notification.new"

echo "PASS: notif_ws.sh completed $pass_count checks against $BASE_URL"
