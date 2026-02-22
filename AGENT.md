# PuckHub CMS

Ice Hockey League Management System — admin UI + API for managing seasons, teams, players, games, standings, and statistics.

## Tech Stack

Turborepo + pnpm monorepo · Hono + tRPC API · TanStack Start (React 19) frontend · Prisma ORM + PostgreSQL · Tailwind CSS + shadcn/ui-style components

## Monorepo Map

| Workspace | Package | Description |
|-----------|---------|-------------|
| `apps/admin` | `@puckhub/admin` | TanStack Start admin UI (port 3000), i18n (DE/EN) |
| `apps/web` | — | Public website (placeholder) |
| `packages/api` | `@puckhub/api` | Hono server + tRPC (25 routers) + Better Auth (port 3001) |
| `packages/db` | `@puckhub/db` | Prisma schema (`prisma/schema.prisma`), migrations, seeds |
| `packages/ui` | `@puckhub/ui` | Shared UI components (Button, Card, Dialog, Badge, etc.) |
| `packages/config` | `@puckhub/config` | Minimal — runtime config lives in DB `system_settings` table |

## Commands

```bash
pnpm dev                # Start Docker (DB + pgAdmin) + all dev servers (admin :3000, api :3001)
pnpm build              # Build all packages and apps
pnpm test               # Run all tests (Vitest)
pnpm test:api           # Run API tests only
pnpm test:e2e           # Run Playwright E2E tests (admin app)
pnpm lint               # TypeScript type-check across all packages
pnpm format             # Format all files with Biome
pnpm format:check       # Check formatting without writing
pnpm check              # Biome check + auto-fix
pnpm check:ci           # Biome CI check (no auto-fix)
pnpm db:generate        # Generate Prisma client
pnpm db:reset           # Reset database via @puckhub/db seed reset utility
pnpm dev:docker:up      # Start Docker containers only
pnpm dev:docker:down    # Stop Docker containers only
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
| `AUTH_URL` | `http://localhost:3001` | Auth base URL |
| `API_PORT` | `3001` | API server port |
| `ADMIN_PORT` | `3000` | Admin dev server port |
| `AUTO_MIGRATE` | `true` | Auto-run migrations on API startup |
| `UPLOAD_DIR` | `./uploads` | File upload directory |
| `PASSKEY_RP_ID` | `localhost` | WebAuthn relying party ID |
| `PASSKEY_RP_NAME` | `PuckHub Admin` | WebAuthn relying party name |
| `PASSKEY_ORIGIN` | `http://localhost:3000` | WebAuthn origin |

## Docker

- **Development**: `docker/docker-compose.yml` — PostgreSQL 16 + pgAdmin (port 5050)
- **Production**: `docker-compose.prod.yml` — PostgreSQL 16 + API container (multi-stage `Dockerfile`)

## Conventions

- **Coding rules**: See [`.claude/rules.md`](.claude/rules.md) for comprehensive coding standards
- **No `.js` extensions** in imports — use extensionless paths everywhere
- **Language**: UI text and error messages are in **German** (with English translations available)
- **i18n**: Two locales (`de-DE`, `en-US`), two namespaces (`common`, `errors`). JSON locale files with React Context and `useTranslation()` hook
- **Package manager**: pnpm 10.28.2 — always use `pnpm`, never npm/yarn
- **TypeScript**: Strict mode, `noUncheckedIndexedAccess`, ES2022 target
- **Path aliases**: `~/` = `src/`, `@/` = `lib/` (admin app only)
- **Formatter/Linter**: Biome (2-space indent, 120-char line width, single quotes JS, double quotes JSX)

## Package-Level Docs

Each package has its own `AGENT.md` with detailed context:
- [`apps/admin/AGENT.md`](apps/admin/AGENT.md) — routes, components, auth/tRPC client
- [`packages/api/AGENT.md`](packages/api/AGENT.md) — routers, procedures, middleware
- [`packages/db/AGENT.md`](packages/db/AGENT.md) — schema, migrations, seeds, patterns
- [`packages/ui/AGENT.md`](packages/ui/AGENT.md) — components, design patterns
- [`packages/config/AGENT.md`](packages/config/AGENT.md) — current minimal state
