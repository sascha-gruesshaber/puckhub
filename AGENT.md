# PuckHub CMS

Ice Hockey League Management Platform — multi-tenant SaaS for managing seasons, teams, players, games, and public league websites with AI-powered game recaps, public game reporting with email verification, passwordless authentication, and localized German/English URLs.

## Tech Stack

Turborepo + pnpm monorepo · Hono + tRPC API · TanStack Start (React 19) frontend · Prisma ORM + PostgreSQL · Tailwind CSS + shadcn/ui-style components

## Monorepo Map

| Workspace | Package | Description |
|-----------|---------|-------------|
| `apps/admin` | `@puckhub/admin` | TanStack Start admin UI (`admin.` subdomain, port 3000), i18n (DE/EN) |
| `apps/platform` | `@puckhub/platform` | TanStack Start platform admin dashboard (`platform.` subdomain, port 3002) |
| `apps/league-site` | `@puckhub/league-site` | Public league website (`*.` wildcard subdomain, port 3003) — standings, schedules, stats, news, localized DE/EN routes |
| `apps/marketing-site` | `@puckhub/marketing-site` | Marketing landing page (bare domain, port 3004) — features, pricing, demo CTA |
| `packages/api` | `@puckhub/api` | Hono server + tRPC (32 routers) + Better Auth + AI recap service (`api.` subdomain, port 3001) |
| `packages/db` | `@puckhub/db` | Prisma schema (`prisma/schema.prisma`), migrations, seeds |
| `packages/ui` | `@puckhub/ui` | Shared UI components (Button, Card, Dialog, Badge, etc.) |
| `packages/config` | `@puckhub/config` | Minimal — runtime config lives in DB `system_settings` table |

## Commands

```bash
pnpm dev                # Start Docker (DB + pgAdmin + Caddy) + all dev servers
pnpm build              # Build all packages and apps
pnpm test               # Run all tests (Vitest)
pnpm test:api           # Run API tests only
pnpm test:e2e           # Run Playwright E2E tests (admin app, default)
pnpm test:e2e:admin     # Run admin E2E tests
pnpm test:e2e:league    # Run league-site E2E tests
pnpm test:e2e:marketing # Run marketing-site E2E tests
pnpm test:e2e:platform  # Run platform E2E tests
pnpm test:e2e:all       # Run all E2E tests sequentially
pnpm lint               # TypeScript type-check across all packages
pnpm format             # Format all files with Biome
pnpm format:check       # Check formatting without writing
pnpm check              # Biome check + auto-fix
pnpm check:ci           # Biome CI check (no auto-fix)
pnpm db:generate        # Generate Prisma client
pnpm db:reset           # Reset database via @puckhub/db seed reset utility
pnpm dev:docker:up      # Start Docker containers only (DB + pgAdmin + Caddy dev proxy)
pnpm dev:docker:down    # Stop Docker containers only
pnpm dev:services       # Start all dev servers via Turborepo (alias for dev:servers)
```

**Per-package** (run from package dir or with `pnpm --filter`):
- `db:migrate` — push schema (dev) · `db:migrate:prod` — run migrations (prod)
- `db:migrate:create` — create/apply a migration locally
- `db:studio` — Prisma Studio visual editor
- `db:seed` — seed reference data only (penalty types, trikot templates, static pages)

## Environment

Copy `.env.example` to `.env`. Key variables:

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | `postgresql://puckhub:puckhub_dev@localhost:5432/puckhub` | PostgreSQL connection |
| `AUTH_SECRET` | — | Better Auth secret (change in prod) |
| `AUTH_URL` | `http://api.puckhub.localhost` | Auth base URL |
| `VITE_API_URL` | `http://api.puckhub.localhost` | API URL for frontend apps |
| `VITE_WEB_URL` | `http://web.puckhub.localhost` | Public site URL for website preview |
| `API_PORT` | `3001` | API server port |
| `ADMIN_PORT` | `3000` | Admin dev server port |
| `AUTO_MIGRATE` | `true` | Auto-run migrations on API startup |
| `UPLOAD_DIR` | `./uploads` | File upload directory |
| `DEFAULT_USER_EMAIL` | `admin@puckhub.local` | Default admin user email (magic link login) |
| `DEMO_MODE` | `false` | Enable demo mode with periodic resets |
| `DEMO_RESET_CRON` | `0 4 * * *` | Cron schedule for demo data reset (daily at 04:00) |
| `PASSKEY_RP_ID` | `puckhub.localhost` | WebAuthn relying party ID |
| `PASSKEY_RP_NAME` | `PuckHub Admin` | WebAuthn relying party name |
| `PASSKEY_ORIGIN` | `http://admin.puckhub.localhost` | WebAuthn origin |
| `BASE_DOMAIN` | `puckhub.localhost` | Base domain for subdomain routing |
| `COOKIE_DOMAIN` | `puckhub.localhost` | Domain for cross-subdomain cookies |
| `SUBDOMAIN_SUFFIX` | `.puckhub.localhost` | Suffix for league subdomains |
| `VITE_BASE_DOMAIN` | `puckhub.localhost` | Base domain exposed to Vite frontends |
| `TRUSTED_ORIGINS` | `http://admin.puckhub.localhost,...` | Comma-separated trusted origins for CORS/auth |
| `BETTER_AUTH_BASE_URL` | `http://api.puckhub.localhost` | Better Auth server base URL |
| `CNAME_TARGET` | `sites.puckhub.localhost` | CNAME target for custom domain verification |
| `SMTP_HOST` | — | SMTP server host (falls back to console logging if unset) |
| `SMTP_PORT` | `587` | SMTP server port |
| `SMTP_USER` | — | SMTP username |
| `SMTP_PASS` | — | SMTP password |
| `SMTP_FROM` | `noreply@puckhub.eu` | Sender email address |
| `OPENROUTER_API_KEY` | — | OpenRouter API key for AI game recaps |
| `OPENROUTER_MODEL` | `google/gemini-3.1-flash-lite-preview` | AI model for recap generation |
| `CONTACT_EMAIL` | — | Recipient for contact form submissions (console fallback if unset) |
| `PUBLIC_REPORT_HASH_SECRET` | — | Secret for hashing public report email/IP (falls back to AUTH_SECRET) |

## Docker

- **Development**: `docker/docker-compose.yml` — PostgreSQL 16 + pgAdmin (port 5050) + Caddy dev proxy (port 80) for subdomain routing (`*.puckhub.localhost`)
- **Dev Caddy**: `docker/Caddyfile.dev` — HTTP-only reverse proxy mapping `admin.puckhub.localhost` → `:3000`, `api.puckhub.localhost` → `:3001`, `platform.puckhub.localhost` → `:3002`, `puckhub.localhost` → `:3004` (marketing-site), `*.puckhub.localhost` → `:3003` (league-site)
- **Local testing**: `docker-compose.local.yml` — same topology as production but with locally-built images (`*:local` tags), HTTP-only Caddy, used by `scripts/docker-test.mjs`
- **Local Caddy**: `docker/Caddyfile.local` — HTTP-only reverse proxy matching production routing (bare domain → marketing-site, `admin.` → admin, `api.` → api, `platform.` → platform, `*.` → league-site)
- **Production**: `docker-compose.prod.yml` — Caddy (subdomain-based reverse proxy + on-demand TLS) + PostgreSQL 16 + API + Admin + Platform + League-site + Marketing-site containers
- **Prod Caddy**: `docker/Caddyfile` — subdomain routing (`api.`, `admin.`, `platform.`, `*.` wildcard for league sites), bare domain → marketing-site

## Conventions

- **Coding rules**: See [`.claude/rules.md`](.claude/rules.md) for comprehensive coding standards
- **No `.js` extensions** in imports — use extensionless paths everywhere
- **Language**: UI text and error messages are in **German** (with English translations available)
- **i18n**: Two locales (`de-DE`, `en-US`), two namespaces (`common`, `errors`). JSON locale files with React Context and `useTranslation()` hook
- **Package manager**: pnpm 10.28.2 — always use `pnpm`, never npm/yarn
- **TypeScript**: Strict mode, `noUncheckedIndexedAccess`, ES2022 target
- **Path aliases**: `~/` = `src/`, `@/` = `lib/` (admin + platform apps)
- **Formatter/Linter**: Biome (2-space indent, 120-char line width, single quotes JS, double quotes JSX)

## Package-Level Docs

Each package has its own `AGENT.md` with detailed context:
- [`apps/admin/AGENT.md`](apps/admin/AGENT.md) — routes, components, auth/tRPC client
- [`apps/platform/AGENT.md`](apps/platform/AGENT.md) — platform admin dashboard, routes, global management
- [`apps/league-site/AGENT.md`](apps/league-site/AGENT.md) — public league frontend, standings, schedules, stats
- [`apps/marketing-site/AGENT.md`](apps/marketing-site/AGENT.md) — marketing landing page, pricing, legal pages
- [`packages/api/AGENT.md`](packages/api/AGENT.md) — routers, procedures, middleware
- [`packages/db/AGENT.md`](packages/db/AGENT.md) — schema, migrations, seeds, patterns
- [`packages/ui/AGENT.md`](packages/ui/AGENT.md) — components, design patterns
- [`packages/config/AGENT.md`](packages/config/AGENT.md) — current minimal state
