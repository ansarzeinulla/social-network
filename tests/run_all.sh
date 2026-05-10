#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE_URL="${TEST_BASE_URL:-http://localhost:8080}"
FRESH_DB=false
SKIP_DOCKER=false
SKIP_GO=false

usage() {
  cat <<'USAGE'
Usage: ./tests/run_all.sh [--fresh-db] [--skip-docker] [--skip-go]

Runs backend Go tests and every shell API test under tests/*/*.sh.

Options:
  --fresh-db     docker compose down -v before starting backend
  --skip-docker  do not start/rebuild backend
  --skip-go      skip `go test ./...`

Environment:
  TEST_BASE_URL  backend URL, default http://localhost:8080
USAGE
}

for arg in "$@"; do
  case "$arg" in
    --fresh-db) FRESH_DB=true ;;
    --skip-docker) SKIP_DOCKER=true ;;
    --skip-go) SKIP_GO=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown argument: $arg" >&2; usage; exit 2 ;;
  esac
done

cd "$ROOT_DIR"

if [[ "$SKIP_GO" != "true" ]]; then
  echo "==> go test ./..."
  (cd backend && go test ./...)
fi

if [[ "$SKIP_DOCKER" != "true" ]]; then
  if [[ "$FRESH_DB" == "true" ]]; then
    echo "==> docker compose down -v"
    docker compose down -v
  fi
  echo "==> docker compose up --build -d backend"
  docker compose up --build -d backend
fi

echo "==> waiting for backend at $BASE_URL"
for _ in {1..60}; do
  status="$(curl -sS -o /tmp/social-network-test-health.txt -w "%{http_code}" "$BASE_URL/api/profile" || true)"
  if [[ "$status" == "401" ]]; then
    break
  fi
  sleep 1
done
if [[ "${status:-}" != "401" ]]; then
  echo "backend did not become ready; last status=${status:-none}" >&2
  cat /tmp/social-network-test-health.txt >&2 || true
  exit 1
fi

find tests -mindepth 2 -maxdepth 2 -name "*.sh" ! -path "tests/system/*" | sort | while read -r test; do
  echo "==> $test"
  TEST_BASE_URL="$BASE_URL" "$test"
done

echo "PASS: all shell API tests completed"
