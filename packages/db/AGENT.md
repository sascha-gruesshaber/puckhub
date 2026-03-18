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

- Enums: 10 (`RoundType`, `Position`, `GameStatus`, `GameEventType`, `NewsStatus`, `PageStatus`, `MenuLocation`, `TrikotTemplateType`, `OrgRole`, `PlanInterval`). Note: `PlanInterval` now only contains `yearly` (monthly removed)
- Models: 41 (auth, organization, core league, stats, CMS, trikot domain, SaaS/billing, AI, public reports)
- SaaS models: `WebsiteConfig` (per-org website settings + custom domain), `Plan` (subscription tiers with feature flags + limits), `OrgSubscription` (org-to-plan binding with Stripe fields)
- AI models: `AiUsageLog` (monthly token tracking per org, indexed on `[organizationId, createdAt]`)
- Public reports: `PublicGameReport` (visitor-submitted game scores with hashed email (`submitterEmailHash`), masked email (`submitterEmailMasked`), hashed IP (`submitterIpHash`) — original email/IP never stored. OTP tracking, active/reverted status)
- Notable additions: `Game.recapTitle/recapContent/recapGeneratedAt/recapGenerating` (AI recap fields), `Organization.aiEnabled`, `Plan.featureAiRecaps/aiMonthlyTokenLimit/featurePublicReports`
- SystemSettings additions: `publicReportsEnabled`, `publicReportsRequireEmail`, `publicReportsBotDetection` (control public report feature per org)
- Most app tables are organization-scoped via `organizationId`
- All `id` fields use `@default(uuid(7))` for time-sortable UUIDs
- Naming convention uses `@@map`/`@map` to keep DB snake_case while code stays camelCase
- Notable migration: `0002_public_report_anonymization` — replaces raw email/IP storage with hashed/masked fields

## Package Scripts

```bash
pnpm db:generate        # prisma generate
pnpm db:migrate         # prisma migrate dev (create + apply migration locally)
pnpm db:migrate:prod    # prisma migrate deploy (production/CI)
pnpm db:seed            # run reference seed
pnpm db:reset           # interactive reset/truncate helper
pnpm db:studio          # Prisma Studio
# pnpm db:push          # BLOCKED — always use db:migrate instead
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

## When Extending Schema -- CRITICAL

**Every schema change MUST have a corresponding migration. No exceptions.**

Production uses `prisma migrate deploy` which only applies committed migration files.
If you change the schema without creating a migration, production will break with
`ColumnNotFound` / `P2022` errors at runtime. This has happened before and caused
production outages.

### Required workflow

1. Edit `prisma/schema.prisma`.
2. Run `pnpm db:generate`.
3. **Immediately** create a migration: `pnpm db:migrate:create` — give it a descriptive name.
4. Verify the generated SQL in `prisma/migrations/<timestamp>_<name>/migration.sql`.
5. Commit the migration folder together with the schema change — never one without the other.

### Rules for AI agents

- If you modify `schema.prisma` (add/remove/rename columns, add models, change defaults),
  you MUST generate or hand-write a migration SQL file before considering the task complete.
- If generating a migration is not possible (e.g. no local database running), you MUST
  explicitly warn the user: **"A migration is required for this schema change. Run
  `pnpm db:migrate:create` before deploying."**
- Never assume `prisma db push` covers production — it does not. Only committed migration
  files in `prisma/migrations/` are applied in production.
- When renaming a column, use `ALTER TABLE ... RENAME COLUMN` instead of drop+add to
  preserve existing data.
