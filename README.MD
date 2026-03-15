# PuckHub CMS

Ice Hockey League Management Platform -- a multi-tenant SaaS system for managing seasons, teams, players, games, and public league websites with AI-powered game recaps, public game reporting with email verification, passwordless authentication (magic links + passkeys), and localized German/English URLs.

## Tech Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **Backend**: Hono + tRPC + Better Auth
- **Database**: Prisma v7 + PostgreSQL
- **Frontend**: TanStack Start (React 19) + Vite
- **UI**: Tailwind CSS + shadcn/ui-style components
- **Infrastructure**: Docker multi-stage builds, Caddy reverse proxy, Coolify deployment

## Project Structure

```
apps/
  admin/            League admin dashboard (TanStack Start, admin.{domain})
  platform/         Global SaaS management UI (TanStack Start, platform.{domain})
  league-site/      Public league frontend (TanStack Start, *.{domain} wildcard)
  marketing-site/   Marketing landing page (TanStack Start, {domain})

packages/
  api/              Hono server + tRPC API + Better Auth + AI recaps (api.{domain})
  db/               Prisma schema, migrations, seeds
  ui/               Shared UI components
  config/           Shared configuration
```

Each service runs on its own subdomain, routed via Caddy reverse proxy.

## Prerequisites

- Node.js 24+
- pnpm 10+
- Docker and Docker Compose

## Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/sascha-gruesshaber/puckhub.cms.git
   cd puckhub.cms
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Configure environment**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set at least `AUTH_SECRET` and `DATABASE_URL`. For AI game recaps, set `OPENROUTER_API_KEY`. For email (magic links), configure `SMTP_*` variables. See `.env.example` for all available variables.

4. **Set up local DNS**

   Add wildcard DNS for `*.puckhub.localhost` pointing to `127.0.0.1`. This can be done via a hosts file entry or dnsmasq.

5. **Start development**

   ```bash
   pnpm dev
   ```

   This starts Docker services (PostgreSQL, pgAdmin, Caddy dev proxy) and all dev servers. The admin dashboard will be available at `http://admin.puckhub.localhost`.

### Individual Commands

```bash
pnpm dev:docker:up      # Start Docker containers only (DB + pgAdmin + Caddy)
pnpm dev:docker:down    # Stop Docker containers
pnpm dev:servers        # Start all dev servers via Turborepo
pnpm build              # Build all packages and apps
pnpm test               # Run all tests (Vitest)
pnpm test:api           # Run API tests only
pnpm test:e2e           # Run Playwright E2E tests
pnpm lint               # TypeScript type-check across all packages
pnpm format             # Format all files with Biome
pnpm db:generate        # Generate Prisma client
pnpm db:reset           # Reset database and re-seed
```

## Docker

A single multi-stage `Dockerfile` produces five images: `puckhub-api`, `puckhub-admin`, `puckhub-platform`, `puckhub-league-site`, and `puckhub-marketing-site`.

```bash
pnpm docker:build           # Build all 5 images locally
pnpm docker:test            # Full-stack local test (start, smoke test, stop)
pnpm docker:test --keep     # Start and keep running for manual testing
pnpm docker:test --down     # Tear down local test stack
pnpm docker:push            # Push images to GHCR
```

## Deployment

Production deployment uses GitHub Actions for CI/CD:

1. Push to `main` triggers image builds.
2. Images are pushed to GitHub Container Registry (GHCR).
3. Coolify watches GHCR and auto-deploys updated images.
4. Caddy handles TLS termination and subdomain routing in production.

## Disclaimer -- No Warranty

**IMPORTANT: Please read this section carefully before self-hosting PuckHub CMS.**

This software is provided strictly **"AS IS"**, without warranty of any kind, express or implied. By using, deploying, or self-hosting this software, you acknowledge and agree that:

- **No guarantees are made** regarding the software's fitness for any particular purpose, reliability, availability, or correctness.
- **Self-hosting is entirely at your own risk.** The author assumes no responsibility whatsoever for any consequences arising from self-hosted deployments.
- **The author is not liable** for any data loss, data corruption, security breaches, unauthorized access, downtime, service interruptions, or any other damages -- whether direct, indirect, incidental, special, or consequential -- that may result from the use of this software.
- **No support or maintenance is guaranteed** for self-hosted instances. The author is under no obligation to provide bug fixes, security patches, updates, or technical assistance.
- **You are solely responsible** for securing your deployment, maintaining backups, and ensuring compliance with applicable laws and regulations.

For the full terms, see the [LICENSE](LICENSE) file.

## License

PuckHub CMS is released under a **Custom Source-Available License**. This is **not** an open-source license.

The source code is available for reference, learning, and contribution purposes. You may view, fork, and submit contributions. However, using this code to operate a competing commercial service is prohibited without prior written permission.

See [LICENSE](LICENSE) for the complete terms.

Copyright (c) 2025-2026 Sascha Gruesshaber
