#!/usr/bin/env bash

BASE_URL="${TEST_BASE_URL:-http://localhost:8080}"
RUN_ID="${TEST_RUN_ID:-$(date +%H%M%S)-$$}"
TMP_DIR="$(mktemp -d)"
LAST_BODY="$TMP_DIR/last-body.txt"
pass_count=0

cleanup_test_tmp() {
  rm -rf "$TMP_DIR"
}
trap cleanup_test_tmp EXIT

request_json() {
  local method="$1"
  local path="$2"
  local body="${3:-}"
  local cookie_jar="${4:-}"

  if [[ -n "$cookie_jar" ]]; then
    curl -sS -X "$method" "$BASE_URL$path" \
      -H "Content-Type: application/json" \
      -d "$body" \
      -c "$cookie_jar" \
      -b "$cookie_jar" \
      -o "$LAST_BODY" \
      -w "%{http_code}"
  else
    curl -sS -X "$method" "$BASE_URL$path" \
      -H "Content-Type: application/json" \
      -d "$body" \
      -o "$LAST_BODY" \
      -w "%{http_code}"
  fi
}

request_get() {
  local path="$1"
  local cookie_jar="${2:-}"

  if [[ -n "$cookie_jar" ]]; then
    curl -sS "$BASE_URL$path" \
      -b "$cookie_jar" \
      -o "$LAST_BODY" \
      -w "%{http_code}"
  else
    curl -sS "$BASE_URL$path" \
      -o "$LAST_BODY" \
      -w "%{http_code}"
  fi
}

request_delete() {
  local path="$1"
  local cookie_jar="$2"

  curl -sS -X DELETE "$BASE_URL$path" \
    -b "$cookie_jar" \
    -o "$LAST_BODY" \
    -w "%{http_code}"
}

request_form() {
  local method="$1"
  local path="$2"
  local cookie_jar="$3"
  shift 3

  curl -sS -X "$method" "$BASE_URL$path" \
    -b "$cookie_jar" \
    "$@" \
    -o "$LAST_BODY" \
    -w "%{http_code}"
}

assert_status() {
  local name="$1"
  local expected="$2"
  local actual="$3"

  if [[ "$actual" != "$expected" ]]; then
    echo "FAIL: $name expected HTTP $expected, got $actual" >&2
    echo "Body:" >&2
    cat "$LAST_BODY" >&2
    exit 1
  fi

  pass_count=$((pass_count + 1))
  echo "ok $pass_count - $name"
}

assert_body_contains() {
  local name="$1"
  local needle="$2"

  if ! grep -Fq "$needle" "$LAST_BODY"; then
    echo "FAIL: $name expected body to contain: $needle" >&2
    echo "Body:" >&2
    cat "$LAST_BODY" >&2
    exit 1
  fi

  pass_count=$((pass_count + 1))
  echo "ok $pass_count - $name"
}

assert_body_not_contains() {
  local name="$1"
  local needle="$2"

  if grep -Fq "$needle" "$LAST_BODY"; then
    echo "FAIL: $name expected body not to contain: $needle" >&2
    echo "Body:" >&2
    cat "$LAST_BODY" >&2
    exit 1
  fi

  pass_count=$((pass_count + 1))
  echo "ok $pass_count - $name"
}

json_number_field() {
  local field="$1"
  sed -nE "s/.*\"$field\"[[:space:]]*:[[:space:]]*([0-9]+).*/\1/p" "$LAST_BODY" | head -n 1
}

register_user() {
  local email="$1"
  local first_name="$2"
  local last_name="$3"
  local is_public="$4"
  local cookie_jar="$5"
  local about_me="${6:-Test profile}"
  local payload

  payload=$(printf '{"email":"%s","password":"Test123!","first_name":"%s","last_name":"%s","date_of_birth":"1995-05-15","about_me":"%s","is_public":%s}' \
    "$email" "$first_name" "$last_name" "$about_me" "$is_public")

  status="$(request_json POST /api/register "$payload" "$cookie_jar")"
  assert_status "register $email" 201 "$status"

  status="$(request_get /api/profile "$cookie_jar")"
  assert_status "load profile for $email" 200 "$status"
  CREATED_USER_ID="$(json_number_field id)"
  if [[ -z "$CREATED_USER_ID" ]]; then
    echo "FAIL: could not extract id for $email" >&2
    cat "$LAST_BODY" >&2
    exit 1
  fi
}
