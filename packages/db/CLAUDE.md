# @puckhub/db

Prisma ORM with PostgreSQL. Schema definitions, migrations, seeds, and services.

## Schema Organization (34 files in `src/schema/`)

**Auth**: `auth.ts` (user, session, account, verification) · `passkey.ts` · `twoFactor.ts`
**Core**: `seasons.ts` · `divisions.ts` · `rounds.ts` · `teams.ts` · `team-divisions.ts` · `venues.ts`
**Players**: `players.ts` · `contracts.ts` (player-team-season links)
**Games**: `games.ts` · `game-events.ts` (goals/penalties) · `game-lineups.ts` (player participation) · `game-suspensions.ts` (multi-game suspensions) · `penalty-types.ts`
**Stats**: `standings.ts` · `bonus-points.ts` · `player-season-stats.ts` · `goalie-season-stats.ts` · `goalie-game-stats.ts`
**Trikots**: `trikot-templates.ts` · `trikots.ts` · `team-trikots.ts`
**Content**: `news.ts` · `pages.ts` (CMS pages with menu locations) · `page-aliases.ts` · `documents.ts` · `sponsors.ts`
**System**: `organization.ts` · `member.ts` · `invitation.ts` · `system-settings.ts`
**Shared**: `enums.ts` · `relations.ts` · `index.ts` (re-exports all)

## Enums (`prisma/schema.prisma`) - 9 enums

- `roundTypeEnum`: regular, preround, playoffs, playdowns, relegation, placement, final, playups
- `positionEnum`: forward, defense, goalie
- `gameStatusEnum`: scheduled, in_progress, completed, postponed, cancelled
- `gameEventTypeEnum`: goal, penalty
- `newsStatusEnum`: draft, published
- `pageStatusEnum`: draft, published
- `menuLocationEnum`: main_nav, footer
- `trikotTemplateTypeEnum`: one_color, two_color
- `orgRoleEnum`: owner, admin, game_manager, game_reporter, team_manager, editor

## Key Patterns

- **Primary keys**: UUID with `defaultRandom()`
- **Timestamps**: `createdAt` / `updatedAt` with timezone (`timestamp({ withTimezone: true })`)
- **Cascade rules**: Foreign keys use `onDelete: 'cascade'` or `onDelete: 'set null'` as appropriate
- **Singleton**: `system_settings` uses `check(eq(id, 1))` constraint
- **Self-joins**: Use `aliasedTable()` from `drizzle-orm/alias` — never use `sql` template as join target
- **Relations**: All defined in `relations.ts` (287 lines), required for `db.query.*.findMany({ with: {} })`

## Services (`src/services/`)

| Service | Purpose |
|---------|---------|
| `standingsService.ts` | Recalculate standings from game results, bonus points |
| `statsService.ts` | Recalculate player and goalie statistics |

Exports: `recalculateStandings`, `recalculatePlayerStats`, `recalculateGoalieStats`

## Migration Workflow

```bash
# After changing schema files:
pnpm db:generate          # Generate Prisma Client in packages/db/src/generated/prisma/
pnpm db:migrate           # Push schema to dev DB (prisma db push)
pnpm db:migrate:create    # Create and apply a new migration locally (prisma migrate dev)
pnpm db:migrate:prod      # Run committed migrations (prisma migrate deploy)
```

Migrations are in `prisma/migrations/` (2 migration directories + `migration_lock.toml`). Auto-migrate on API startup when `AUTO_MIGRATE=true`.

## Seed System

- `src/seed/index.ts` — **Reference data**: penalty types (6), trikot templates (2), static pages (3: Impressum, Datenschutz, Kontakt). Safe to re-run (`onConflictDoNothing`)
- `src/seed/demo.ts` — **Demo data**: 10 teams, 100 players, 16 seasons (15 past + 1 current), venues, contracts, game reports (lineups/events/suspensions), news, sponsors, pages, admin user (`admin@demo.local` / `demo1234`). Truncates all tables first
- `src/seed/run.ts` — Entry point for reference seed
- `src/seed/reset.ts` — Database reset utility (truncates all tables with CASCADE, interactive prompt unless `--force`)
- `src/seed/seedImages.ts` — Image generation utilities for seed data

## Adding a New Table

1. Create `src/schema/{name}.ts` with table definition
2. Export from `src/schema/index.ts`
3. Add relations in `src/schema/relations.ts` if needed
4. Run `pnpm db:generate` then `pnpm db:migrate`

## Main Exports

```ts
import { db, schema, runMigrations, runSeed } from '@puckhub/db'
import { seasons, teams, ... } from '@puckhub/db/schema'
import { recalculateStandings, recalculatePlayerStats, recalculateGoalieStats } from '@puckhub/db/services'
```
