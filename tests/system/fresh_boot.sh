#!/usr/bin/env bash
set -euo pipefail

# Fresh boot smoke:
# - backend starts from a fresh Docker volume;
# - migrations run;
# - seeded login works.
#
# This test is intentionally not part of tests/run_all.sh because it resets
# the Docker volume. Run it explicitly when you want a clean migration check.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BASE_URL="${TEST_BASE_URL:-http://localhost:8080}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

cd "$ROOT_DIR"

docker compose down -v
docker compose up --build -d backend

for _ in {1..60}; do
  status="$(curl -sS -o "$TMP_DIR/health.txt" -w "%{http_code}" "$BASE_URL/api/profile" || true)"
  if [[ "$status" == "401" ]]; then
    break
  fi
  sleep 1
done
if [[ "$status" != "401" ]]; then
  echo "FAIL: backend did not become ready after fresh boot, last status=$status" >&2
  cat "$TMP_DIR/health.txt" >&2 || true
  exit 1
fi
echo "ok 1 - backend starts with fresh volume"

cookie_jar="$TMP_DIR/alice.cookies"
status="$(curl -sS -X POST "$BASE_URL/api/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@test.com","password":"Test123!"}' \
  -c "$cookie_jar" \
  -b "$cookie_jar" \
  -o "$TMP_DIR/login.txt" \
  -w "%{http_code}")"
if [[ "$status" != "200" ]]; then
  echo "FAIL: seeded Alice login expected HTTP 200, got $status" >&2
  cat "$TMP_DIR/login.txt" >&2
  exit 1
fi
echo "ok 2 - seeded Alice can login after migrations"

status="$(curl -sS "$BASE_URL/api/groups" \
  -b "$cookie_jar" \
  -o "$TMP_DIR/groups.txt" \
  -w "%{http_code}")"
if [[ "$status" != "200" ]]; then
  echo "FAIL: groups list expected HTTP 200, got $status" >&2
  cat "$TMP_DIR/groups.txt" >&2
  exit 1
fi
if ! grep -Fq "Go Developers" "$TMP_DIR/groups.txt"; then
  echo "FAIL: seeded groups were not present after migrations" >&2
  cat "$TMP_DIR/groups.txt" >&2
  exit 1
fi
echo "ok 3 - seeded groups are present"

echo "PASS: fresh_boot.sh completed 3 checks against $BASE_URL"
