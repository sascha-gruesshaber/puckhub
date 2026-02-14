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
# Dependencies stage - install all dependencies
# ============================================================================
FROM base AS deps

# Copy package manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/admin/package.json ./apps/admin/
COPY apps/web/package.json ./apps/web/
COPY packages/api/package.json ./packages/api/
COPY packages/db/package.json ./packages/db/
COPY packages/config/package.json ./packages/config/
COPY packages/ui/package.json ./packages/ui/

# Install dependencies
RUN pnpm install --frozen-lockfile

# ============================================================================
# Builder stage - build all packages and apps
# ============================================================================
FROM base AS builder

# Copy node_modules from deps
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps ./apps
COPY --from=deps /app/packages ./packages

# Copy source code
COPY . .

# Build all packages and apps
RUN pnpm build

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

# Copy built artifacts — only runtime-needed packages (api + its dependency db)
COPY --from=builder --chown=puckhub:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=puckhub:nodejs /app/packages/api ./packages/api
COPY --from=builder --chown=puckhub:nodejs /app/packages/db ./packages/db
COPY --from=builder --chown=puckhub:nodejs /app/apps/admin/.output ./apps/admin/.output

# Copy root package.json and admin package.json for runtime
COPY --chown=puckhub:nodejs package.json ./
COPY --chown=puckhub:nodejs apps/admin/package.json ./apps/admin/

# Switch to non-root user
USER puckhub

# Expose ports
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start API server from its package directory (tsx needed for workspace .ts imports)
# Note: For production, you may want to run both API and admin in separate containers
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
