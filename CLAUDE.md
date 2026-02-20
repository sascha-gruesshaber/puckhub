# PuckHub CMS

Ice Hockey League Management System — admin UI + API for managing seasons, teams, players, games, standings, and statistics.

## Tech Stack

Turborepo + pnpm monorepo · Hono + tRPC API · TanStack Start (React 19) frontend · Drizzle ORM + PostgreSQL · Tailwind CSS + shadcn/ui-style components

## Monorepo Map

| Workspace | Package | Description |
|-----------|---------|-------------|
| `apps/admin` | `@puckhub/admin` | TanStack Start admin UI (port 3000), i18n (DE/EN) |
| `apps/web` | — | Public website (placeholder) |
| `packages/api` | `@puckhub/api` | Hono server + tRPC (25 routers) + Better Auth (port 3001) |
| `packages/db` | `@puckhub/db` | Drizzle schema (34 files, 8 enums), migrations, seeds |
| `packages/ui` | `@puckhub/ui` | Shared UI components (Button, Card, Dialog, Badge, etc.) |
| `packages/config` | `@puckhub/config` | Minimal — runtime config lives in DB `system_settings` table |

## Commands

```bash
pnpm dev                # Start Docker (DB + pgAdmin) + all dev servers (admin :3000, api :3001)
pnpm build              # Build all packages and apps
pnpm test               # Run all tests (Vitest)
pnpm lint               # TypeScript type-check across all packages
pnpm db:generate        # Generate Drizzle migrations after schema changes
pnpm db:seed:demo       # Seed demo data (10 teams, 100 players, 16 seasons)
pnpm docker:up          # Start Docker containers only
pnpm docker:down        # Stop Docker containers
```

**Per-package** (run from package dir or with `pnpm --filter`):
- `db:migrate` — push schema (dev) · `db:migrate:prod` — run migrations (prod)
- `db:studio` — Drizzle Studio visual editor
- `db:seed` — seed reference data only (penalty types, trikot templates)
- `test:e2e` — Playwright E2E tests (admin app)

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

## Conventions

- **Coding rules**: See [`.claude/rules.md`](.claude/rules.md) for comprehensive coding standards
- **No `.js` extensions** in imports — use extensionless paths everywhere
- **Language**: UI text and error messages are in **German** (with English translations available)
- **i18n**: Two locales (`de-DE`, `en-US`), two namespaces (`common`, `errors`). JSON locale files with React Context and `useTranslation()` hook
- **Package manager**: pnpm 10.28.2 — always use `pnpm`, never npm/yarn
- **TypeScript**: Strict mode, `noUncheckedIndexedAccess`, ES2022 target
- **Path aliases**: `~/` = `src/`, `@/` = `lib/` (admin app only)

## Package-Level Docs

Each package has its own `CLAUDE.md` with detailed context:
- [`apps/admin/CLAUDE.md`](apps/admin/CLAUDE.md) — routes, components, auth/tRPC client
- [`packages/api/CLAUDE.md`](packages/api/CLAUDE.md) — routers, procedures, middleware
- [`packages/db/CLAUDE.md`](packages/db/CLAUDE.md) — schema, migrations, seeds, patterns
- [`packages/ui/CLAUDE.md`](packages/ui/CLAUDE.md) — components, design patterns
- [`packages/config/CLAUDE.md`](packages/config/CLAUDE.md) — current minimal state
