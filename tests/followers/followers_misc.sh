#!/usr/bin/env bash
set -euo pipefail

# Misc followers/presence coverage:
# - legacy /api/followers returns current user's followers;
# - /api/users/{id}/online reflects an active websocket connection.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../helpers.sh
source "$SCRIPT_DIR/../helpers.sh"

target_cookie="$TMP_DIR/target.cookies"
follower_cookie="$TMP_DIR/follower.cookies"

register_user "fm-target-${RUN_ID}@t.io" "Follow" "MiscTarget" true "$target_cookie" "Follow misc target bio"
target_id="$CREATED_USER_ID"
register_user "fm-follow-${RUN_ID}@t.io" "Follow" "MiscFollower" true "$follower_cookie" "Follow misc follower bio"
follower_id="$CREATED_USER_ID"

status="$(request_json POST "/api/follow/$target_id" '{}' "$follower_cookie")"
assert_status "follower follows target for legacy followers" 200 "$status"

status="$(request_get /api/followers "$target_cookie")"
assert_status "legacy followers endpoint loads current user followers" 200 "$status"
assert_body_contains "legacy followers include follower" "\"id\":$follower_id"

status="$(request_get "/api/users/$target_id/online" "$follower_cookie")"
assert_status "online endpoint loads while target offline" 200 "$status"
assert_body_contains "target starts offline" "\"online\":false"

(
  cd "$SCRIPT_DIR/../../backend"
  go run ../tests/ws_client.go -base "$BASE_URL" -cookie "$target_cookie" -mode ping -expect pong -hold 10s >/dev/null
) &
ws_pid=$!
pass_count=$((pass_count + 1))
echo "ok $pass_count - target websocket connection opened"

online_seen=false
for _ in 1 2 3 4 5 6 7 8 9 10; do
  status="$(request_get "/api/users/$target_id/online" "$follower_cookie")"
  assert_status "online endpoint loads while target websocket is open" 200 "$status"
  if grep -Fq '"online":true' "$LAST_BODY"; then
    online_seen=true
    break
  fi
  sleep 1
done

if [[ "$online_seen" != "true" ]]; then
  echo "FAIL: target did not become online while websocket was open" >&2
  cat "$LAST_BODY" >&2
  exit 1
fi
pass_count=$((pass_count + 1))
echo "ok $pass_count - target is online with active websocket"

wait "$ws_pid"

echo "PASS: followers_misc.sh completed $pass_count checks against $BASE_URL"
