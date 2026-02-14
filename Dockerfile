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
# Builder stage - install all dependencies and build apps
# Dependencies are installed in the same stage to preserve pnpm symlinks
# ============================================================================
FROM base AS builder

# Copy package manifests first (Docker layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/admin/package.json ./apps/admin/
COPY apps/web/package.json ./apps/web/
COPY packages/api/package.json ./packages/api/
COPY packages/db/package.json ./packages/db/
COPY packages/config/package.json ./packages/config/
COPY packages/ui/package.json ./packages/ui/

# Install all dependencies (dev + prod)
RUN pnpm install --frozen-lockfile

# Copy source code (.dockerignore excludes node_modules, dist, .output at all depths)
COPY . .

# Build the admin app (Vite resolves workspace TS sources directly)
# Package type-checking is handled by CI lint step, not Docker build
RUN pnpm --filter @puckhub/admin run build

# Remove turbo cache (not needed at runtime)
RUN rm -rf .turbo node_modules/.cache

# ============================================================================
# Production runner stage
# ============================================================================
FROM base AS runner

# Set production environment
ENV NODE_ENV=production

# Add non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 puckhub

# Create necessary directories
RUN mkdir -p /app/uploads && \
    chown -R puckhub:nodejs /app

# Copy pruned node_modules and root manifests from builder
COPY --from=builder --chown=puckhub:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=puckhub:nodejs /app/package.json ./
COPY --from=builder --chown=puckhub:nodejs /app/pnpm-lock.yaml ./
COPY --from=builder --chown=puckhub:nodejs /app/pnpm-workspace.yaml ./
COPY --from=builder --chown=puckhub:nodejs /app/tsconfig.base.json ./

# Copy all workspace packages (source, tsconfig, node_modules, migrations)
COPY --from=builder --chown=puckhub:nodejs /app/packages ./packages

# Copy app package.json files (pnpm workspace needs these)
COPY --from=builder --chown=puckhub:nodejs /app/apps/admin/package.json ./apps/admin/
COPY --from=builder --chown=puckhub:nodejs /app/apps/web/package.json ./apps/web/

# Copy built admin app (Vite/TanStack Start output)
COPY --from=builder --chown=puckhub:nodejs /app/apps/admin/dist ./apps/admin/dist

# Switch to non-root user
USER puckhub

# Expose ports
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the API server using tsx (runs TypeScript directly)
# WORKDIR must be the API package for pnpm's strict node_modules to resolve tsx
WORKDIR /app/packages/api
CMD ["node", "--import", "tsx", "src/index.ts"]

# Build metadata (for container labels)
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
