#!/usr/bin/env bash
# Build all PuckHub Docker images locally.
# Usage: scripts/docker-build.sh [TAG]
#   TAG defaults to "local"
#
# The same multi-stage Dockerfile is used with different --target flags,
# matching the GitHub Actions workflow. Docker layer caching means the
# shared builder stage only runs once.

set -euo pipefail
cd "$(dirname "$0")/.."

TAG="${1:-local}"

echo "Building PuckHub Docker images (tag: ${TAG})..."
echo ""

BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
VCS_REF=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

declare -A TARGETS=(
  [api]=api-runner
  [admin]=admin-runner
  [platform]=platform-runner
  [league-site]=league-site-runner
)

for app in api admin platform league-site; do
  target="${TARGETS[$app]}"
  image="puckhub-${app}:${TAG}"

  echo "━━━ Building ${image} (target: ${target}) ━━━"
  docker build \
    --target "$target" \
    --tag "$image" \
    --build-arg BUILD_DATE="$BUILD_DATE" \
    --build-arg VCS_REF="$VCS_REF" \
    --build-arg VERSION="$TAG" \
    .
  echo ""
done

echo "All images built:"
docker images --filter "reference=puckhub-*:${TAG}" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
