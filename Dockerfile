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

# Build frontends (API URL and base domain are derived at runtime from hostname)
RUN pnpm --filter @puckhub/admin run build
RUN pnpm --filter @puckhub/platform run build
RUN pnpm --filter @puckhub/league-site run build

# Remove caches not needed at runtime
RUN rm -rf .turbo node_modules/.cache

# ============================================================================
# Shared runtime base (Node.js + non-root user, no app files)
# ============================================================================
FROM node:${NODE_VERSION}-alpine AS runner-base

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 puckhub

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

# All services expose port 3000 — reverse proxy handles external routing
EXPOSE 3000

# ============================================================================
# API runtime image (needs node_modules + packages for tsx runtime)
# ============================================================================
FROM runner-base AS api-runner

RUN mkdir -p /app/uploads && chown -R puckhub:nodejs /app
WORKDIR /app

COPY --from=builder --chown=puckhub:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=puckhub:nodejs /app/package.json ./
COPY --from=builder --chown=puckhub:nodejs /app/pnpm-lock.yaml ./
COPY --from=builder --chown=puckhub:nodejs /app/pnpm-workspace.yaml ./
COPY --from=builder --chown=puckhub:nodejs /app/tsconfig.base.json ./
COPY --from=builder --chown=puckhub:nodejs /app/packages ./packages

USER puckhub
ENV API_PORT=3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))"

WORKDIR /app/packages/api
CMD ["node", "--import", "tsx", "src/index.ts"]

# ============================================================================
# Admin runtime image (Nitro standalone bundle — no node_modules needed)
# ============================================================================
FROM runner-base AS admin-runner

WORKDIR /app
COPY --from=builder --chown=puckhub:nodejs /app/apps/admin/.output ./apps/admin/.output

USER puckhub
ENV PORT=3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode < 500 ? 0 : 1)}).on('error', () => process.exit(1))"

WORKDIR /app/apps/admin
CMD ["node", ".output/server/index.mjs"]

# ============================================================================
# Platform runtime image (Nitro standalone bundle — no node_modules needed)
# ============================================================================
FROM runner-base AS platform-runner

WORKDIR /app
COPY --from=builder --chown=puckhub:nodejs /app/apps/platform/.output ./apps/platform/.output

USER puckhub
ENV PORT=3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode < 500 ? 0 : 1)}).on('error', () => process.exit(1))"

WORKDIR /app/apps/platform
CMD ["node", ".output/server/index.mjs"]

# ============================================================================
# League-site runtime image (Nitro standalone bundle — no node_modules needed)
# ============================================================================
FROM runner-base AS league-site-runner

WORKDIR /app
COPY --from=builder --chown=puckhub:nodejs /app/apps/league-site/.output ./apps/league-site/.output

USER puckhub
ENV PORT=3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode < 500 ? 0 : 1)}).on('error', () => process.exit(1))"

WORKDIR /app/apps/league-site
CMD ["node", ".output/server/index.mjs"]
