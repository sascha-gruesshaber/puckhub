# PuckHub - Production Docker Image
# Copyright (c) 2025 Sascha Grüßhaber
# Licensed under Custom Source-Available License

# Build arguments
ARG NODE_VERSION=20
ARG PNPM_VERSION=10.28.2

# ============================================================================
# Base stage with Node.js and pnpm
# ============================================================================
FROM node:${NODE_VERSION}-alpine AS base

ARG PNPM_VERSION
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /app

# ============================================================================
# Builder stage - install dependencies and build apps
# ============================================================================
FROM base AS builder

ARG VITE_API_URL=
ARG PLATFORM_BASE_PATH=/

# Copy package manifests first (Docker layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/admin/package.json ./apps/admin/
COPY apps/platform/package.json ./apps/platform/
COPY apps/league-site/package.json ./apps/league-site/
COPY packages/api/package.json ./packages/api/
COPY packages/db/package.json ./packages/db/
COPY packages/config/package.json ./packages/config/
COPY packages/ui/package.json ./packages/ui/

# Copy Prisma schema (needed by @puckhub/db postinstall → prisma generate)
COPY packages/db/prisma ./packages/db/prisma

# Install all dependencies (dev + prod)
RUN pnpm install --frozen-lockfile

# Copy source code (.dockerignore excludes node_modules, dist, .output at all depths)
COPY . .

# Build frontends with production base/API settings
RUN VITE_API_URL="${VITE_API_URL}" pnpm --filter @puckhub/admin run build
RUN VITE_API_URL="${VITE_API_URL}" VITE_BASE_PATH="${PLATFORM_BASE_PATH}" pnpm --filter @puckhub/platform run build
RUN VITE_API_URL="${VITE_API_URL}" pnpm --filter @puckhub/league-site run build

# Remove caches not needed at runtime
RUN rm -rf .turbo node_modules/.cache

# ============================================================================
# Runtime base stage shared by API/Admin/Platform runners
# ============================================================================
FROM base AS runner-base

# Set production environment
ENV NODE_ENV=production

# Add non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 puckhub

# Create necessary directories
RUN mkdir -p /app/uploads && \
    chown -R puckhub:nodejs /app

# Copy workspace runtime files
COPY --from=builder --chown=puckhub:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=puckhub:nodejs /app/package.json ./
COPY --from=builder --chown=puckhub:nodejs /app/pnpm-lock.yaml ./
COPY --from=builder --chown=puckhub:nodejs /app/pnpm-workspace.yaml ./
COPY --from=builder --chown=puckhub:nodejs /app/tsconfig.base.json ./
COPY --from=builder --chown=puckhub:nodejs /app/packages ./packages
COPY --from=builder --chown=puckhub:nodejs /app/apps/admin/package.json ./apps/admin/
COPY --from=builder --chown=puckhub:nodejs /app/apps/platform/package.json ./apps/platform/
COPY --from=builder --chown=puckhub:nodejs /app/apps/league-site/package.json ./apps/league-site/
COPY --from=builder --chown=puckhub:nodejs /app/apps/admin/dist ./apps/admin/dist
COPY --from=builder --chown=puckhub:nodejs /app/apps/platform/dist ./apps/platform/dist
COPY --from=builder --chown=puckhub:nodejs /app/apps/league-site/dist ./apps/league-site/dist

# Shared OCI labels
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION

LABEL org.opencontainers.image.title="PuckHub" \
      org.opencontainers.image.description="Ice hockey league management system" \
      org.opencontainers.image.vendor="Sascha Grüßhaber" \
      org.opencontainers.image.licenses="Custom Source-Available License" \
      org.opencontainers.image.url="https://github.com/sascha-gruesshaber/puckhub" \
      org.opencontainers.image.source="https://github.com/sascha-gruesshaber/puckhub" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.documentation="https://github.com/sascha-gruesshaber/puckhub#readme"

# Switch to non-root user
USER puckhub

# ============================================================================
# API runtime image
# ============================================================================
FROM runner-base AS api-runner

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))"

WORKDIR /app/packages/api
CMD ["node", "--import", "tsx", "src/index.ts"]

# ============================================================================
# Admin runtime image
# ============================================================================
FROM runner-base AS admin-runner

ENV PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode < 500 ? 0 : 1)}).on('error', () => process.exit(1))"

WORKDIR /app/apps/admin
CMD ["node", "dist/server/server.js"]

# ============================================================================
# Platform runtime image
# ============================================================================
FROM runner-base AS platform-runner

ENV PORT=3002
EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/', (r) => {process.exit(r.statusCode < 500 ? 0 : 1)}).on('error', () => process.exit(1))"

WORKDIR /app/apps/platform
CMD ["node", "dist/server/server.js"]

# ============================================================================
# League-site runtime image
# ============================================================================
FROM runner-base AS league-site-runner

ENV PORT=3003
EXPOSE 3003
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3003/', (r) => {process.exit(r.statusCode < 500 ? 0 : 1)}).on('error', () => process.exit(1))"

WORKDIR /app/apps/league-site
CMD ["node", "dist/server/server.js"]
