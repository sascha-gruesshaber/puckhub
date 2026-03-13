#!/usr/bin/env bash
# Start the full PuckHub stack locally and run smoke tests.
#
# Usage:
#   scripts/docker-test.sh          # start, test, stop
#   scripts/docker-test.sh --keep   # start, test, keep running
#   scripts/docker-test.sh --down   # tear down (remove volumes too)
#   scripts/docker-test.sh --logs   # show logs from running stack
#
# Prerequisites:
#   1. scripts/docker-build.sh (builds local images)
#   2. *.puckhub.localhost DNS (already set up for dev)
#   3. Port 80 free (stop dev Caddy first: pnpm dev:docker:down)

set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE_FILE="docker-compose.local.yml"
COMPOSE="docker compose -f $COMPOSE_FILE"

# ── Parse args ──────────────────────────────────────────────────
KEEP_RUNNING=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --keep|-k)  KEEP_RUNNING=true; shift ;;
    --down|-d)  $COMPOSE down -v; echo "Stack removed."; exit 0 ;;
    --logs|-l)  $COMPOSE logs -f; exit 0 ;;
    *)          echo "Usage: $0 [--keep|-k] [--down|-d] [--logs|-l]"; exit 1 ;;
  esac
done

if [ "$KEEP_RUNNING" = false ]; then
  trap '$COMPOSE down; echo "Stack stopped."' EXIT
fi

# ── Preflight checks ───────────────────────────────────────────
for img in puckhub-api puckhub-admin puckhub-platform puckhub-league-site; do
  if ! docker image inspect "${img}:local" &>/dev/null; then
    echo "Image ${img}:local not found. Run scripts/docker-build.sh first."
    exit 1
  fi
done

# Check port 80 is free
if command -v ss &>/dev/null; then
  if ss -tlnp 2>/dev/null | grep -q ':80 '; then
    echo "WARNING: Port 80 is in use. Stop the dev Caddy first (pnpm dev:docker:down)."
    exit 1
  fi
fi

# ── Start stack ─────────────────────────────────────────────────
echo "Starting local stack..."
$COMPOSE up -d

echo ""
echo "Waiting for services to become healthy..."

services=(api admin platform league-site)
for svc in "${services[@]}"; do
  printf "  %-15s" "${svc}..."
  timeout=120
  elapsed=0
  while true; do
    # docker compose ps --format json may output one JSON object per line
    health=$($COMPOSE ps --format json "$svc" 2>/dev/null \
      | grep -o '"Health":"[^"]*"' | head -1 | cut -d'"' -f4 \
      || echo "")
    if [ "$health" = "healthy" ]; then
      echo "healthy"
      break
    fi
    if [ $elapsed -ge $timeout ]; then
      echo "TIMEOUT (${timeout}s)"
      echo ""
      echo "  Last 30 lines of ${svc} logs:"
      $COMPOSE logs --tail=30 "$svc"
      exit 1
    fi
    sleep 3
    elapsed=$((elapsed + 3))
  done
done

# ── Smoke tests ─────────────────────────────────────────────────
echo ""
echo "━━━ Smoke Tests ━━━"
pass=0
fail=0

check() {
  local name="$1" url="$2" expect="$3"
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>/dev/null || echo "000")
  if [ "$status" = "$expect" ]; then
    printf "  %-30s %s\n" "$name" "OK (HTTP ${status})"
    pass=$((pass + 1))
  else
    printf "  %-30s %s\n" "$name" "FAIL (expected ${expect}, got ${status})"
    fail=$((fail + 1))
  fi
}

check "API health (via Caddy)"    "http://api.puckhub.localhost/api/health"  "200"
check "Admin UI (via Caddy)"      "http://admin.puckhub.localhost/"           "200"
check "Platform UI (via Caddy)"   "http://platform.puckhub.localhost/"        "200"

echo ""
echo "Results: ${pass} passed, ${fail} failed"

if [ $fail -gt 0 ]; then
  echo ""
  echo "Check service logs with: scripts/docker-test.sh --logs"
  exit 1
fi

# ── Keep running? ───────────────────────────────────────────────
if [ "$KEEP_RUNNING" = true ]; then
  echo ""
  echo "Stack is running. Access:"
  echo "  Admin:    http://admin.puckhub.localhost"
  echo "  API:      http://api.puckhub.localhost/api/health"
  echo "  Platform: http://platform.puckhub.localhost"
  echo ""
  echo "  Default login: admin@puckhub.local / admin123"
  echo ""
  echo "  Logs:  scripts/docker-test.sh --logs"
  echo "  Stop:  scripts/docker-test.sh --down"
fi
