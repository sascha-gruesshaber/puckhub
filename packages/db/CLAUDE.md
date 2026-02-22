# @puckhub/db

Prisma ORM with PostgreSQL. Schema definitions, migrations, seeds, and services.

## Schema Organization (`prisma/schema.prisma`)

All 37 models and 9 enums are defined in a single Prisma schema file with `@@map` annotations to preserve existing table/column names.

**Auth**: `User` · `Session` · `Account` · `Verification` · `TwoFactor` · `Passkey`
**Core**: `Season` · `Division` · `Round` · `Team` · `TeamDivision` · `Venue`
**Players**: `Player` · `Contract` (player-team-season links)
**Games**: `Game` · `GameEvent` (goals/penalties) · `GameLineup` (player participation) · `GameSuspension` (multi-game suspensions) · `PenaltyType`
**Stats**: `Standing` · `BonusPoint` · `PlayerSeasonStat` · `GoalieSeasonStat` · `GoalieGameStat`
**Trikots**: `TrikotTemplate` · `Trikot` · `TeamTrikot`
**Content**: `News` · `Page` (CMS pages with menu locations) · `PageAlias` · `Document` · `Sponsor`
**System**: `Organization` · `Member` · `MemberRole` · `Invitation` · `SystemSettings`

## Enums (`prisma/schema.prisma`) — 9 enums

- `RoundType`: regular, preround, playoffs, playdowns, relegation, placement, final, playups
- `Position`: forward, defense, goalie
- `GameStatus`: scheduled, in_progress, completed, postponed, cancelled
- `GameEventType`: goal, penalty
- `NewsStatus`: draft, published
- `PageStatus`: draft, published
- `MenuLocation`: main_nav, footer
- `TrikotTemplateType`: one_color, two_color
- `OrgRole`: owner, admin, member, viewer

## Key Patterns

- **Primary keys**: UUID with `@default(uuid())`
- **Timestamps**: `createdAt` / `updatedAt` with `@default(now())` and `@updatedAt`
- **Cascade rules**: Relations use `onDelete: Cascade` or `onDelete: SetNull` as appropriate
- **Singleton**: `system_settings` enforced via application logic
- **Relations**: All defined inline in `prisma/schema.prisma` with Prisma relation fields

## Services (`src/services/`)

| Service | Purpose |
|---------|---------|
| `standingsService.ts` | Recalculate standings from game results, bonus points |
| `statsService.ts` | Recalculate player and goalie statistics |

Exports: `recalculateStandings`, `recalculatePlayerStats`, `recalculateGoalieStats`

## Migration Workflow

```bash
# After changing prisma/schema.prisma:
pnpm db:generate          # Regenerate Prisma Client in src/generated/prisma/
pnpm db:migrate:create    # Create a new migration file (prisma migrate dev)
pnpm db:migrate           # Push schema to dev DB (prisma db push, no migration file)
pnpm db:migrate:prod      # Apply pending migrations (prisma migrate deploy)
```

Migrations are in `prisma/migrations/` with a `migration_lock.toml` tracking file. Auto-migrate on API startup when `AUTO_MIGRATE=true` (runs `prisma migrate deploy`).

## Seed System

- `src/seed/index.ts` — **Reference data**: penalty types (6), trikot templates (2), static pages (3: Impressum, Datenschutz, Kontakt). Safe to re-run (`onConflictDoNothing`)
- `src/seed/demoSeed.ts` — **Demo data**: 10 teams, 100 players, 16 seasons (15 past + 1 current), venues, contracts, game reports (lineups/events/suspensions), news, sponsors, pages, admin user (`admin@demo.local` / `demo1234`). Truncates all tables first
- `src/seed/run.ts` — Entry point for reference seed
- `src/seed/reset.ts` — Database reset utility (truncates all tables with CASCADE, interactive prompt unless `--force`)
- `src/seed/seedImages.ts` — Image generation utilities for seed data

## Adding a New Table

1. Add a new `model` block in `prisma/schema.prisma` with `@@map("table_name")`
2. Add relations to other models as needed
3. Run `pnpm db:migrate:create` (dev) or `pnpm db:migrate` (push without migration file)
4. Run `pnpm db:generate` to regenerate the Prisma Client

## Main Exports

```ts
import { db, runMigrations, runSeed } from '@puckhub/db'
import type { Database, Prisma } from '@puckhub/db'
```
