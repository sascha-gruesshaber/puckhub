# @puckhub/db

Prisma ORM package for PostgreSQL. Owns schema, migrations, seeds, and DB-facing services.

## Core Layout

- `prisma/schema.prisma` - single source of truth for enums/models/relations
- `prisma/migrations/` - committed Prisma migrations + `migration_lock.toml`
- `src/index.ts` - Prisma client creation (`@prisma/adapter-pg`) and package exports
- `src/migrate.ts` - `runMigrations()` wrapper (`prisma migrate deploy`)
- `src/services/` - standings/statistics recalculation logic
- `src/seed/` - reference/demo seed workflows and reset utilities

## Prisma Schema

- Enums: 10 (`RoundType`, `Position`, `GameStatus`, `GameEventType`, `NewsStatus`, `PageStatus`, `MenuLocation`, `TrikotTemplateType`, `OrgRole`, `PlanInterval`)
- Models: 39 (auth, organization, core league, stats, CMS, trikot domain, SaaS/billing)
- SaaS models: `WebsiteConfig` (per-org website settings + custom domain), `Plan` (subscription tiers with feature flags + limits), `OrgSubscription` (org-to-plan binding with Stripe fields)
- Most app tables are organization-scoped via `organizationId`
- Naming convention uses `@@map`/`@map` to keep DB snake_case while code stays camelCase

## Package Scripts

```bash
pnpm db:generate        # prisma generate
pnpm db:migrate         # prisma db push (dev)
pnpm db:migrate:create  # prisma migrate dev (create + apply local migration)
pnpm db:migrate:prod    # prisma migrate deploy (production/CI)
pnpm db:seed            # run reference seed
pnpm db:reset           # interactive reset/truncate helper
pnpm db:studio          # Prisma Studio
```

## Runtime Behavior

- API startup calls `runMigrations(db)` and `runSeed(db)` when `AUTO_MIGRATE` is enabled.
- `runSeed` (`src/seed/index.ts`) is idempotent reference seeding (penalty types + trikot templates).
- Demo data flow lives in `src/seed/demoSeed.ts` and is separate from reference seeding.
- Image seeding logic in `src/seed/seedImages.ts` handles logo/photo uploads during demo seeding.

## Main Exports

```ts
import { db, runMigrations, runSeed } from '@puckhub/db'
import { GameStatus, RoundType, OrgRole } from '@puckhub/db'
import { recalculateStandings, recalculatePlayerStats, recalculateGoalieStats } from '@puckhub/db/services'
```

## When Extending Schema

1. Edit `prisma/schema.prisma`.
2. Run `pnpm db:generate`.
3. For local evolution use `pnpm db:migrate:create` (preferred for tracked changes).
4. Commit the generated migration folder under `prisma/migrations/`.
