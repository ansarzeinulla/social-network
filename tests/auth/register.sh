#!/usr/bin/env bash
set -euo pipefail

# Aggressive registration test:
# - successful registration with all text profile fields;
# - successful registration without optional avatar/nickname/about_me;
# - broken required fields, bad email, future birth date;
# - duplicate email conflict.

BASE_URL="${TEST_BASE_URL:-http://localhost:8080}"
RUN_ID="$(date +%H%M%S)-$$"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

pass_count=0

status_of() {
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

full_email="rf${RUN_ID}@t.io"
full_cookie="$TMP_DIR/full.cookies"
full_payload=$(printf '{"email":"%s","password":"Test123!","first_name":"Reg","last_name":"Full","date_of_birth":"1995-05-15","avatar":"/uploads/test-avatar.png","nickname":"regfull%s","about_me":"Registration test user","is_public":true}' "$full_email" "$RUN_ID")

status="$(status_of POST /api/register "$full_payload" "$full_cookie")"
assert_status "register with all fields" 201 "$status"
assert_cookie_exists "register with all fields sets session cookie" "$full_cookie"
status="$(get_status_with_cookie /api/profile "$full_cookie")"
assert_status "registered user can access own profile" 200 "$status"

minimal_email="rm${RUN_ID}@t.io"
minimal_cookie="$TMP_DIR/minimal.cookies"
minimal_payload=$(printf '{"email":"%s","password":"Test123!","first_name":"Reg","last_name":"Min","date_of_birth":"1996-06-16","is_public":true}' "$minimal_email")

status="$(status_of POST /api/register "$minimal_payload" "$minimal_cookie")"
assert_status "register without optional avatar/nickname/about_me" 201 "$status"
assert_cookie_exists "minimal register sets session cookie" "$minimal_cookie"

empty_required_payload='{"email":"","password":"","first_name":"","last_name":"","date_of_birth":""}'
status="$(status_of POST /api/register "$empty_required_payload")"
assert_status "reject empty required fields" 400 "$status"

bad_email_payload='{"email":"not-an-email","password":"Test123!","first_name":"Bad","last_name":"Email","date_of_birth":"1995-05-15"}'
status="$(status_of POST /api/register "$bad_email_payload")"
assert_status "reject malformed email" 400 "$status"

future_birth_payload=$(printf '{"email":"rfuture%s@t.io","password":"Test123!","first_name":"Bad","last_name":"Birth","date_of_birth":"2035-01-01"}' "$RUN_ID")
status="$(status_of POST /api/register "$future_birth_payload")"
assert_status "reject future date of birth" 400 "$status"

dup_email="rd${RUN_ID}@t.io"
dup_payload=$(printf '{"email":"%s","password":"Test123!","first_name":"Reg","last_name":"Dup","date_of_birth":"1994-04-14","is_public":true}' "$dup_email")

status="$(status_of POST /api/register "$dup_payload")"
assert_status "create duplicate-test user first time" 201 "$status"
status="$(status_of POST /api/register "$dup_payload")"
assert_status "reject duplicate email" 409 "$status"

echo "PASS: register.sh completed $pass_count checks against $BASE_URL"
