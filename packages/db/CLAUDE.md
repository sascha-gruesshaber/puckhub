# @puckhub/db

Drizzle ORM with PostgreSQL. Schema definitions, migrations, and seed data.

## Schema Organization (32 files in `src/schema/`)

**Auth**: `auth.ts` (user, session, account, verification)
**Core**: `seasons.ts` · `divisions.ts` · `rounds.ts` · `teams.ts` · `team-divisions.ts` · `venues.ts`
**Players**: `players.ts` · `contracts.ts` (player-team-season links)
**Games**: `games.ts` · `game-events.ts` (goals/penalties) · `game-lineups.ts` (player participation) · `game-suspensions.ts` (multi-game suspensions) · `penalty-types.ts`
**Stats**: `standings.ts` · `bonus-points.ts` · `player-season-stats.ts` · `goalie-season-stats.ts` · `goalie-game-stats.ts`
**Trikots**: `trikot-templates.ts` · `trikots.ts` · `team-trikots.ts`
**Content**: `news.ts` · `pages.ts` (CMS pages with menu locations) · `page-aliases.ts` · `documents.ts` · `sponsors.ts`
**System**: `user-roles.ts` · `system-settings.ts`
**Shared**: `enums.ts` · `relations.ts` · `index.ts` (re-exports all)

## Enums (`src/schema/enums.ts`) — 10 enums

- `roundTypeEnum`: regular, preround, playoffs, playdowns, relegation, placement, final
- `positionEnum`: forward, defense, goalie
- `gameStatusEnum`: scheduled, in_progress, completed, postponed, cancelled
- `gameEventTypeEnum`: goal, penalty
- `roleEnum`: super_admin, league_admin, team_manager, scorekeeper, viewer
- `newsStatusEnum`: draft, published
- `pageStatusEnum`: draft, published
- `menuLocationEnum`: main_nav, footer
- `trikotTemplateTypeEnum`: one_color, two_color

## Key Patterns

- **Primary keys**: UUID with `defaultRandom()`
- **Timestamps**: `createdAt` / `updatedAt` with timezone (`timestamp({ withTimezone: true })`)
- **Cascade rules**: Foreign keys use `onDelete: 'cascade'` or `onDelete: 'set null'` as appropriate
- **Singleton**: `system_settings` uses `check(eq(id, 1))` constraint
- **Self-joins**: Use `aliasedTable()` from `drizzle-orm/alias` — never use `sql` template as join target
- **Relations**: All defined in `relations.ts` (~190 lines), required for `db.query.*.findMany({ with: {} })`

## Migration Workflow

```bash
# After changing schema files:
pnpm db:generate          # Generate SQL migration in packages/db/drizzle/
pnpm db:migrate           # Push to dev DB (drizzle-kit push)
pnpm db:migrate:prod      # Run migrations (drizzle-kit migrate)
```

Migrations are in `drizzle/` (4 migration files) with journal tracking. Auto-migrate on API startup when `AUTO_MIGRATE=true`.

## Seed System

- `src/seed/index.ts` — **Reference data**: penalty types (6), trikot templates (2). Safe to re-run (`onConflictDoNothing`)
- `src/seed/demo.ts` — **Demo data**: 10 teams, 100 players, 16 seasons (15 past + 1 current), venues, contracts, game reports (lineups/events/suspensions), news, sponsors, pages, admin user (`admin@demo.local` / `demo1234`). Truncates all tables first
- `src/seed/run.ts` — Entry point for reference seed

## Adding a New Table

1. Create `src/schema/{name}.ts` with table definition
2. Export from `src/schema/index.ts`
3. Add relations in `src/schema/relations.ts` if needed
4. Run `pnpm db:generate` then `pnpm db:migrate`

## Main Exports

```ts
import { db, schema, runMigrations, runSeed } from '@puckhub/db'
import { seasons, teams, ... } from '@puckhub/db/schema'
```
