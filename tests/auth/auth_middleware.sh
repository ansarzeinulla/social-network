#!/usr/bin/env bash
set -euo pipefail

# Global protected-endpoint test:
# - every known protected URL must return 401 without a cookie;
# - every known protected URL must return 401 with a fake/expired cookie.

BASE_URL="${TEST_BASE_URL:-http://localhost:8080}"
RUN_ID="$(date +%H%M%S)-$$"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

pass_count=0

protected_routes=(
  "GET /api/profile"
  "GET /api/profile/1"
  "POST /api/profile/privacy"
  "POST /api/profile/avatar"
  "POST /api/profile/cover"
  "GET /api/followers"
  "GET /api/users/1/followers"
  "GET /api/users/1/following"
  "GET /api/users/1/online"
  "GET /api/users/1/posts"
  "POST /api/follow/1"
  "DELETE /api/follow/1"
  "GET /api/follow-requests"
  "POST /api/follow-requests/1/accept"
  "POST /api/follow-requests/1/decline"
  "GET /api/posts"
  "GET /api/post?id=1"
  "POST /api/posts/create"
  "POST /api/posts/update"
  "POST /api/posts/delete?id=1"
  "GET /api/posts/1/comments"
  "POST /api/posts/1/comments"
  "GET /api/chats"
  "GET /api/chats/messages?peer_id=1"
  "GET /api/groups/chat/history?group_id=1"
  "GET /api/notifications"
  "POST /api/notifications/read-all"
  "POST /api/notifications/1"
  "GET /api/groups"
  "POST /api/groups"
  "GET /api/groups/1"
  "GET /api/groups/1/members"
  "POST /api/groups/1/join"
  "POST /api/groups/1/invite"
  "POST /api/groups/1/accept"
)

status_of() {
  local method="$1"
  local path="$2"
  local cookie_header="${3:-}"
  local out_file="$TMP_DIR/body-${pass_count}.txt"

  if [[ -n "$cookie_header" ]]; then
    curl -sS -X "$method" "$BASE_URL$path" \
      -H "Cookie: $cookie_header" \
      -o "$out_file" \
      -w "%{http_code}"
  else
    curl -sS -X "$method" "$BASE_URL$path" \
      -o "$out_file" \
      -w "%{http_code}"
  fi
}

assert_unauthorized() {
  local name="$1"
  local actual="$2"

  if [[ "$actual" != "401" ]]; then
    echo "FAIL: $name expected HTTP 401, got $actual" >&2
    exit 1
  fi

  pass_count=$((pass_count + 1))
  echo "ok $pass_count - $name"
}

for route in "${protected_routes[@]}"; do
  method="${route%% *}"
  path="${route#* }"
  status="$(status_of "$method" "$path")"
  assert_unauthorized "without cookie: $method $path" "$status"
done

fake_cookie="session_token=fake-or-expired-token-${RUN_ID}"
for route in "${protected_routes[@]}"; do
  method="${route%% *}"
  path="${route#* }"
  status="$(status_of "$method" "$path" "$fake_cookie")"
  assert_unauthorized "fake cookie: $method $path" "$status"
done

status="$(status_of GET /ws)"
assert_unauthorized "without cookie: GET /ws websocket endpoint" "$status"

status="$(status_of GET /ws "$fake_cookie")"
assert_unauthorized "fake cookie: GET /ws websocket endpoint" "$status"

echo "PASS: auth_middleware.sh completed $pass_count checks against $BASE_URL"
