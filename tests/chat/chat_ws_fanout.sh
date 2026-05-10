#!/usr/bin/env bash
set -euo pipefail

# WebSocket fan-out:
# - private chat.new reaches the targeted receiver, not an unrelated user;
# - group_chat.new reaches all connected group members.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

wait_ready() {
  local file="$1"
  for _ in {1..50}; do
    [[ -f "$file" ]] && return 0
    sleep 0.1
  done
  echo "FAIL: websocket listener did not become ready: $file" >&2
  exit 1
}

sender_cookie="$TMP_DIR/sender.cookies"
receiver_cookie="$TMP_DIR/receiver.cookies"
third_cookie="$TMP_DIR/third.cookies"
creator_cookie="$TMP_DIR/creator.cookies"
member1_cookie="$TMP_DIR/member1.cookies"
member2_cookie="$TMP_DIR/member2.cookies"

register_user "cwf-send-${RUN_ID}@t.io" "Fan" "Sender" true "$sender_cookie"
register_user "cwf-recv-${RUN_ID}@t.io" "Fan" "Receiver" true "$receiver_cookie"
receiver_id="$CREATED_USER_ID"
register_user "cwf-third-${RUN_ID}@t.io" "Fan" "Third" true "$third_cookie"

status="$(request_json POST "/api/follow/$receiver_id" '{}' "$sender_cookie")"
assert_status "sender follows receiver for fanout" 200 "$status"

receiver_ready="$TMP_DIR/receiver.ready"
third_ready="$TMP_DIR/third.ready"
(
  cd "$SCRIPT_DIR/../../backend"
  go run ../tests/ws_client.go -base "$BASE_URL" -cookie "$receiver_cookie" -mode listen -expect chat.new -ready "$receiver_ready" -timeout 6s > "$TMP_DIR/receiver.out"
) &
receiver_pid=$!
(
  cd "$SCRIPT_DIR/../../backend"
  go run ../tests/ws_client.go -base "$BASE_URL" -cookie "$third_cookie" -mode noevent -expect chat.new -ready "$third_ready" -timeout 2s > "$TMP_DIR/third.out"
) &
third_pid=$!
wait_ready "$receiver_ready"
wait_ready "$third_ready"

private_message="targeted websocket ${RUN_ID}"
(
  cd "$SCRIPT_DIR/../../backend"
  go run ../tests/ws_client.go -base "$BASE_URL" -cookie "$sender_cookie" -mode private -to-user "$receiver_id" -body "$private_message" -expect "" >/dev/null
)
wait "$receiver_pid"
assert_body_file_contains() {
  local name="$1"
  local file="$2"
  local needle="$3"
  if ! grep -Fq "$needle" "$file"; then
    echo "FAIL: $name expected $file to contain $needle" >&2
    cat "$file" >&2 || true
    exit 1
  fi
  pass_count=$((pass_count + 1))
  echo "ok $pass_count - $name"
}
assert_body_file_contains "target receiver receives private websocket event" "$TMP_DIR/receiver.out" "chat.new"
wait "$third_pid"
assert_body_file_contains "unrelated websocket client receives no private event" "$TMP_DIR/third.out" "noevent"

register_user "cwf-create-${RUN_ID}@t.io" "Fan" "Creator" true "$creator_cookie"
register_user "cwf-mem1-${RUN_ID}@t.io" "Fan" "MemberOne" true "$member1_cookie"
member1_id="$CREATED_USER_ID"
register_user "cwf-mem2-${RUN_ID}@t.io" "Fan" "MemberTwo" true "$member2_cookie"
member2_id="$CREATED_USER_ID"

status="$(request_json POST /api/groups "{\"title\":\"FanoutGroup${RUN_ID}\",\"description\":\"fanout\"}" "$creator_cookie")"
assert_status "create group for websocket fanout" 200 "$status"
group_id="$(json_number_field id)"
status="$(request_json POST "/api/groups/$group_id/invite" "{\"user_id\":$member1_id}" "$creator_cookie")"
assert_status "invite first fanout member" 200 "$status"
status="$(request_json POST "/api/groups/$group_id/accept" '{}' "$member1_cookie")"
assert_status "first fanout member accepts" 200 "$status"
status="$(request_json POST "/api/groups/$group_id/invite" "{\"user_id\":$member2_id}" "$creator_cookie")"
assert_status "invite second fanout member" 200 "$status"
status="$(request_json POST "/api/groups/$group_id/accept" '{}' "$member2_cookie")"
assert_status "second fanout member accepts" 200 "$status"

member1_ready="$TMP_DIR/member1.ready"
member2_ready="$TMP_DIR/member2.ready"
(
  cd "$SCRIPT_DIR/../../backend"
  go run ../tests/ws_client.go -base "$BASE_URL" -cookie "$member1_cookie" -mode listen -expect group_chat.new -ready "$member1_ready" -timeout 6s > "$TMP_DIR/member1.out"
) &
member1_pid=$!
(
  cd "$SCRIPT_DIR/../../backend"
  go run ../tests/ws_client.go -base "$BASE_URL" -cookie "$member2_cookie" -mode listen -expect group_chat.new -ready "$member2_ready" -timeout 6s > "$TMP_DIR/member2.out"
) &
member2_pid=$!
wait_ready "$member1_ready"
wait_ready "$member2_ready"

group_message="group fanout ${RUN_ID}"
(
  cd "$SCRIPT_DIR/../../backend"
  go run ../tests/ws_client.go -base "$BASE_URL" -cookie "$creator_cookie" -mode group -group "$group_id" -body "$group_message" -expect "" >/dev/null
)
wait "$member1_pid"
wait "$member2_pid"
assert_body_file_contains "first group member receives group websocket event" "$TMP_DIR/member1.out" "group_chat.new"
assert_body_file_contains "second group member receives group websocket event" "$TMP_DIR/member2.out" "group_chat.new"

echo "PASS: chat_ws_fanout.sh completed $pass_count checks against $BASE_URL"
