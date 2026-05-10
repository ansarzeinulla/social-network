#!/usr/bin/env bash
set -euo pipefail

# Login test:
# - successful login and session cookie;
# - wrong password, unknown email, SQL-injection-like login;
# - uppercase email case-sensitivity probe.

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

assert_cookie_exists() {
  local name="$1"
  local cookie_jar="$2"

  if ! grep -q "session_token" "$cookie_jar"; then
    echo "FAIL: $name did not set session_token cookie" >&2
    exit 1
  fi

  pass_count=$((pass_count + 1))
  echo "ok $pass_count - $name"
}

email="lg${RUN_ID}@t.io"
password="Test123!"
register_payload=$(printf '{"email":"%s","password":"%s","first_name":"Log","last_name":"In","date_of_birth":"1993-03-13","is_public":true}' "$email" "$password")

status="$(request_json POST /api/register "$register_payload")"
assert_status "prepare login user by registering it" 201 "$status"

login_cookie="$TMP_DIR/login.cookies"
login_payload=$(printf '{"email":"%s","password":"%s"}' "$email" "$password")
status="$(request_json POST /api/login "$login_payload" "$login_cookie")"
assert_status "login with correct credentials" 200 "$status"
assert_cookie_exists "login sets session cookie" "$login_cookie"
status="$(get_status_with_cookie /api/profile "$login_cookie")"
assert_status "login cookie opens protected profile" 200 "$status"

wrong_password_payload=$(printf '{"email":"%s","password":"Wrong123!"}' "$email")
status="$(request_json POST /api/login "$wrong_password_payload")"
assert_status "reject wrong password" 401 "$status"

missing_email_payload=$(printf '{"email":"no%s@t.io","password":"%s"}' "$RUN_ID" "$password")
status="$(request_json POST /api/login "$missing_email_payload")"
assert_status "reject unknown email" 401 "$status"

sql_injection_payload='{"email":"'\'' OR 1=1 --","password":"Test123!"}'
status="$(request_json POST /api/login "$sql_injection_payload")"
assert_status_in "reject SQL-injection-like email" "400 401" "$status"

upper_email="$(printf '%s' "$email" | tr '[:lower:]' '[:upper:]')"
upper_email_payload=$(printf '{"email":"%s","password":"%s"}' "$upper_email" "$password")
status="$(request_json POST /api/login "$upper_email_payload")"
assert_status "reject uppercase variant of registered email" 401 "$status"

echo "PASS: login.sh completed $pass_count checks against $BASE_URL"
