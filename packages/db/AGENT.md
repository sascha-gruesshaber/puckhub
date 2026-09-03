# @puckhub/db

Prisma ORM package for PostgreSQL. Owns schema, migrations, seeds, and DB-facing services.

## Core Layout

- `prisma/schema.prisma` - single source of truth for enums/models/relations
- `prisma/migrations/` - committed Prisma migrations + `migration_lock.toml`. Folders are sequentially numbered (`0001_init` … `0014_audit_constraints_and_indexes`), not timestamped
- `src/index.ts` - Prisma client creation (`@prisma/adapter-pg`) and package exports
- `src/migrate.ts` - `runMigrations()` wrapper (shells out to `prisma migrate deploy`; takes no arguments)
- `src/services/` - standings/statistics recalculation logic. Every recalculation resolves the owning organization from the round/season, scopes all reads to it, and writes atomically (prune + `INSERT … ON CONFLICT DO UPDATE` via `runAtomic`), so readers never see an empty or duplicated table. Services accept a `DbClient` (Prisma client or interactive-transaction client)
- `src/seed/` - reference/demo seed workflows and reset utilities

## Prisma Schema

- Enums: 13 (`RoundType`, `Position`, `GameStatus`, `GameEventType`, `PlayerStatus`, `NewsStatus`, `PageStatus`, `MenuLocation`, `AiHomeWidgetType`, `TrikotTemplateType`, `OrgRole`, `PlanInterval`, `TrikotAssignmentType`). Note: `PlanInterval` now only contains `yearly` (monthly removed)
- Models: 44 (auth, organization, core league, stats, CMS, trikot domain, SaaS/billing, AI, public reports)
- SaaS models: `WebsiteConfig` (per-org website settings + custom domain), `Plan` (subscription tiers with feature flags + limits), `OrgSubscription` (org-to-plan binding with Stripe fields)
- AI models: `AiUsageLog` (monthly token tracking per org), `AiHomeWidget` (per-org, per-season, per-widget-type cached AI content with staleness detection via data hash)
- Public reports: `PublicGameReport` (visitor-submitted game scores with hashed email (`submitterEmailHash`), masked email (`submitterEmailMasked`), hashed IP (`submitterIpHash`) — original email/IP never stored. Revert audit trail via `reverted`/`revertedBy`/`revertedAt`/`revertNote`. One-time codes are **not** stored here — `packages/api/src/lib/otp.ts` keeps them in the Better Auth `verification` table)
- Team/player history: `Contract.previousContractId` (self-relation) marks a contract that continues an earlier one for the same player and team — written by `contract.splitContract` and by `team.merge`, and read by roster change lists so a split spell is not reported as a departure plus a re-signing. `TeamNameHistory` holds the former names of a team, each valid up to and including one season (`untilSeasonId`); the current name stays on `Team`
- Notable additions: `Game.recapTitle/recapContent/recapGeneratedAt/recapGenerating` (AI recap fields), `Organization.aiEnabled` + granular AI toggles (`aiGameRecaps`, `aiNewsSeo`, `aiPageSeo`, `aiWidget*`), `Plan.featureAi/aiMonthlyTokenLimit/featurePublicReports`, `AiHomeWidget` (per-org, per-season, per-widget-type cached AI content)
- SystemSettings additions: `publicReportsEnabled`, `publicReportsRequireEmail`, `publicReportsBotDetection` (control public report feature per org)
- Most app tables are organization-scoped via `organizationId`
- Application tables use `@default(uuid(7)) @db.Uuid` for time-sortable UUIDs. The Better Auth-owned tables (`User`, `Session`, `Account`, `Verification`, `Member`, `Invitation`, `TwoFactor`, `Passkey`, `Organization`) declare a plain `String @id` because Better Auth generates those ids itself
- Naming convention uses `@@map`/`@map` to keep DB snake_case while code stays camelCase
- Notable migration: `0002_public_report_anonymization` — replaces raw email/IP storage with hashed/masked fields
- Notable migration: `0013_contract_split_and_team_lineage` — `contracts.previous_contract_id` + `team_name_history` table
- Notable migration: `0014_audit_constraints_and_indexes` — natural-key uniques on `standings`, `player_season_stats`, `goalie_season_stats`, `goalie_game_stats`, `member`, `team_divisions`, `page_aliases`; indexes for the hot query paths (Better Auth `userId`/`identifier` columns, `games` by round/status and org/status/date, `game_events` by game/type and player FKs, `news` by org/status/published_at); drops eight prefix-redundant indexes. Hand-written; validated with `prisma migrate diff` in CI

## Package Scripts

```bash
pnpm db:generate        # prisma generate
pnpm db:migrate         # prisma migrate dev (create + apply migration locally)
pnpm db:migrate:prod    # prisma migrate deploy (production/CI)
pnpm db:seed            # reference seed (penalty types, trikot templates, plans)
pnpm db:reset           # interactive reset/truncate helper
pnpm db:studio          # Prisma Studio
# pnpm db:push          # BLOCKED — always use db:migrate instead
```

## Not In This Package

The one-off legacy MariaDB importer used to live in `src/eal-migration/`. It now lives in
[`tools/eal-migration`](../../tools/eal-migration/README.md), so `mysql2` is no longer a
dependency of this package and no longer ships in the production image.

## Runtime Behavior

- API startup calls `runMigrations()` and `runSeed(db)` when `AUTO_MIGRATE` is enabled.
- `runSeed` (`src/seed/index.ts`) is idempotent reference seeding: penalty types, trikot templates, plans, plus a slug + Free-plan backfill for existing organizations. It does **not** create pages — system route pages are owned by `ensureSystemPages` in `@puckhub/api`, which the API calls for every organization right after seeding.
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
3. **Immediately** create a migration: `pnpm db:migrate` (`prisma migrate dev`) — give it a descriptive name.
4. Verify the generated SQL in `prisma/migrations/<nnnn>_<name>/migration.sql`, and rename the folder to continue the sequential numbering if Prisma generated a timestamped one.
5. Commit the migration folder together with the schema change — never one without the other.

### Rules for AI agents

- If you modify `schema.prisma` (add/remove/rename columns, add models, change defaults),
  you MUST generate or hand-write a migration SQL file before considering the task complete.
- If generating a migration is not possible (e.g. no local database running), you MUST
  explicitly warn the user: **"A migration is required for this schema change. Run
  `pnpm db:migrate` before deploying."**
- Never assume `prisma db push` covers production — it does not. Only committed migration
  files in `prisma/migrations/` are applied in production.
- When renaming a column, use `ALTER TABLE ... RENAME COLUMN` instead of drop+add to
  preserve existing data.
