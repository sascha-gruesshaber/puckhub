#!/usr/bin/env bash
# Tag and push local Docker images to GHCR.
#
# Usage:
#   scripts/docker-push.sh                    # push :local as :latest
#   scripts/docker-push.sh local v1.2.3       # push :local as :v1.2.3
#   scripts/docker-push.sh local latest sha-abc123   # multiple remote tags
#
# Prerequisites:
#   1. scripts/docker-build.sh (builds local images)
#   2. docker login ghcr.io (GHCR authentication)

set -euo pipefail
cd "$(dirname "$0")/.."

REGISTRY="${REGISTRY:-ghcr.io}"
NAMESPACE="${NAMESPACE:-sascha-gruesshaber}"
SOURCE_TAG="${1:-local}"
shift || true
PUSH_TAGS=("${@:-latest}")

images=(puckhub-api puckhub-admin puckhub-platform puckhub-league-site)

echo "Registry:   ${REGISTRY}/${NAMESPACE}"
echo "Source tag:  ${SOURCE_TAG}"
echo "Push tags:   ${PUSH_TAGS[*]}"
echo ""

# ── Check images exist ──────────────────────────────────────────
for img in "${images[@]}"; do
  if ! docker image inspect "${img}:${SOURCE_TAG}" &>/dev/null; then
    echo "Image ${img}:${SOURCE_TAG} not found. Run scripts/docker-build.sh first."
    exit 1
  fi
done

# ── Check login ─────────────────────────────────────────────────
if ! docker login "${REGISTRY}" --get-login &>/dev/null 2>&1; then
  echo "Not logged in to ${REGISTRY}. Run:"
  echo "  echo \$GHCR_TOKEN | docker login ${REGISTRY} -u USERNAME --password-stdin"
  exit 1
fi

# ── Tag and push ────────────────────────────────────────────────
for img in "${images[@]}"; do
  for tag in "${PUSH_TAGS[@]}"; do
    remote="${REGISTRY}/${NAMESPACE}/${img}:${tag}"
    echo "  ${img}:${SOURCE_TAG} -> ${remote}"
    docker tag "${img}:${SOURCE_TAG}" "${remote}"
    docker push "${remote}"
  done
done

echo ""
echo "All images pushed successfully."
