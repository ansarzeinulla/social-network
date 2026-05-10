#!/usr/bin/env bash
set -euo pipefail

# Logout test:
# - successful logout destroys the active session;
# - repeated logout without a valid session is handled safely;
# - fake/expired cookie cannot access protected endpoints.

BASE_URL="${TEST_BASE_URL:-http://localhost:8080}"
RUN_ID="$(date +%H%M%S)-$$"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

pass_count=0

request_json() {
  local method="$1"
  local path="$2"
  local body="$3"
  local cookie_jar="${4:-}"
  local out_file="$TMP_DIR/body-${pass_count}.txt"

  if [[ -n "$cookie_jar" ]]; then
    curl -sS -X "$method" "$BASE_URL$path" \
      -H "Content-Type: application/json" \
      -d "$body" \
      -c "$cookie_jar" \
      -b "$cookie_jar" \
      -o "$out_file" \
      -w "%{http_code}"
  else
    curl -sS -X "$method" "$BASE_URL$path" \
      -H "Content-Type: application/json" \
      -d "$body" \
      -o "$out_file" \
      -w "%{http_code}"
  fi
}

get_status_with_cookie() {
  local path="$1"
  local cookie_jar="$2"
  local out_file="$TMP_DIR/get-${pass_count}.txt"

  curl -sS "$BASE_URL$path" \
    -b "$cookie_jar" \
    -o "$out_file" \
    -w "%{http_code}"
}

post_with_cookie_header() {
  local path="$1"
  local cookie_header="$2"
  local out_file="$TMP_DIR/header-${pass_count}.txt"

  curl -sS -X POST "$BASE_URL$path" \
    -H "Cookie: $cookie_header" \
    -o "$out_file" \
    -w "%{http_code}"
}

get_with_cookie_header() {
  local path="$1"
  local cookie_header="$2"
  local out_file="$TMP_DIR/header-get-${pass_count}.txt"

  curl -sS "$BASE_URL$path" \
    -H "Cookie: $cookie_header" \
    -o "$out_file" \
    -w "%{http_code}"
}

assert_status() {
  local name="$1"
  local expected="$2"
  local actual="$3"

  if [[ "$actual" != "$expected" ]]; then
    echo "FAIL: $name expected HTTP $expected, got $actual" >&2
    exit 1
  fi

  pass_count=$((pass_count + 1))
  echo "ok $pass_count - $name"
}

assert_status_in() {
  local name="$1"
  local expected_list="$2"
  local actual="$3"

  for expected in $expected_list; do
    if [[ "$actual" == "$expected" ]]; then
      pass_count=$((pass_count + 1))
      echo "ok $pass_count - $name"
      return
    fi
  done

  echo "FAIL: $name expected one of [$expected_list], got $actual" >&2
  exit 1
}

email="lo${RUN_ID}@t.io"
password="Test123!"
cookie_jar="$TMP_DIR/session.cookies"
register_payload=$(printf '{"email":"%s","password":"%s","first_name":"Log","last_name":"Out","date_of_birth":"1992-02-12","is_public":true}' "$email" "$password")

status="$(request_json POST /api/register "$register_payload" "$cookie_jar")"
assert_status "prepare logout user by registering it" 201 "$status"

status="$(get_status_with_cookie /api/profile "$cookie_jar")"
assert_status "session works before logout" 200 "$status"

status="$(request_json POST /api/logout '{}' "$cookie_jar")"
assert_status "logout active session" 200 "$status"

status="$(get_status_with_cookie /api/profile "$cookie_jar")"
assert_status "session is invalid after logout" 401 "$status"

status="$(request_json POST /api/logout '{}' "$cookie_jar")"
assert_status_in "repeat logout without active session is safe" "200 401" "$status"

fake_cookie="session_token=fake-or-expired-token-${RUN_ID}"
status="$(post_with_cookie_header /api/logout "$fake_cookie")"
assert_status_in "logout with fake or expired cookie is safe" "200 401" "$status"

status="$(get_with_cookie_header /api/profile "$fake_cookie")"
assert_status "fake or expired cookie cannot access profile" 401 "$status"

echo "PASS: logout.sh completed $pass_count checks against $BASE_URL"
