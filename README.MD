# PuckHub

Ice hockey league management platform. Built for regional ice hockey leagues to manage seasons, teams, players, game schedules, live scoring, standings, and statistics.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | [Hono](https://hono.dev) (HTTP) + [tRPC](https://trpc.io) (type-safe API, 22 routers) |
| **ORM** | [Drizzle](https://orm.drizzle.team) (PostgreSQL, 32 schema files, 10 enums) |
| **Auth** | [Better Auth](https://www.better-auth.com) (self-hosted, email/password) |
| **Frontend** | [TanStack Start](https://tanstack.com/start) (SSR + Router + Query, React 19) |
| **UI** | [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) style components |
| **i18n** | German (primary) + English, JSON locale files with React Context |
| **Monorepo** | [Turborepo](https://turbo.build) + [pnpm](https://pnpm.io) workspaces |
| **Database** | PostgreSQL 16 (Docker for local dev) |

## Features

- **Season Management** — Create seasons with date ranges, divisions, rounds (regular, playoffs, playdowns, relegation, etc.)
- **Structure Builder** — Visual React Flow canvas to design season structure (divisions, rounds, team assignments)
- **Team & Player Management** — Teams with logos/colors/venues, player profiles with photos, contract/roster management
- **Game Scheduling** — Round-robin scheduler, calendar view, unscheduled game sidebar
- **Game Reports** — Full game report editor with lineup management, goal/penalty tracking, timeline view, multi-game suspensions
- **Standings & Statistics** — Auto-calculated standings, player/goalie stats with season/team filters
- **Content Management** — News articles (draft/published), CMS pages with menu locations, sponsor management
- **Jersey Management** — Trikot templates, team jersey assignments with color customization
- **Venue Management** — Venues with addresses, linked to teams and games
- **User Management** — Role-based access (super_admin, league_admin, team_manager, scorekeeper, viewer)
- **Setup Wizard** — Guided onboarding for first-time league setup
- **Multi-language** — Full German and English UI with language picker

## Monorepo Structure

```
puckhub.cms/
├── apps/
│   ├── admin/          # TanStack Start admin CMS (26 routes, ~65 components)
│   └── web/            # Future public-facing site
├── packages/
│   ├── api/            # Hono + tRPC server, 22 routers, 3 services (@puckhub/api)
│   ├── db/             # Drizzle schema (32 files) + migrations (4) + seeds (@puckhub/db)
│   ├── config/         # Minimal — runtime config in DB (@puckhub/config)
│   └── ui/             # Shared UI components — 11 files, 13+ exports (@puckhub/ui)
├── docker/             # Docker Compose + pgAdmin config
```

## Prerequisites

- **Node.js** 20+
- **pnpm** 9+
- **Docker** (for PostgreSQL)

## Getting Started

1. **Clone and install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Start development:**
   ```bash
   pnpm dev
   ```

   This starts:
   - Docker containers (PostgreSQL + pgAdmin)
   - API server at `http://localhost:3001` (auto-runs migrations and seed on startup)
   - Admin app at `http://localhost:3000`
   - pgAdmin at `http://localhost:5050` (auto-configured, login: `admin@puckhub.local` / `admin`)

4. **Complete setup:** Navigate to `http://localhost:3000` and follow the onboarding wizard to configure your league and create your admin account.

## Available Commands

```bash
pnpm dev                # Start Docker (DB + pgAdmin) + all dev servers
pnpm build              # Build all packages and apps
pnpm test               # Run all tests (Vitest)
pnpm lint               # TypeScript type-check across all packages
pnpm db:generate        # Generate Drizzle migrations after schema changes
pnpm db:seed:demo       # Seed demo data (10 teams, 100 players, 16 seasons)
pnpm docker:up          # Start Docker containers only
pnpm docker:down        # Stop Docker containers
```

## Settings

League settings (name, locale, timezone, scoring) are configured through the admin UI at **Settings > Einstellungen**. These are stored in the database and can be changed at any time.

## Roadmap

1. ~~**Foundation** - Monorepo, schema, API, auth, admin shell~~
2. ~~**Core Data** - Season setup, teams, players, roster management~~
3. ~~**Game Management** - Round-robin scheduler, game reports, auto standings~~
4. **Statistics** - Standings engine, player/goalie stats, filters
5. ~~**Content** - News, pages, sponsors, document management~~
6. **Public Site** - SSR fan-facing website with live standings

## 📄 License & Usage

PuckHub is **source-available** software with a custom commercial license.

### ✅ You CAN:
- View and study the source code
- Self-host for your own ice hockey league
- Modify for your own organization's internal use
- Contribute improvements back to the project

### ❌ You CANNOT (without a commercial license):
- Resell or distribute this software
- Offer it as a hosted service to other leagues
- Create competing commercial products
- Remove or modify license notices

### 💼 Commercial Licensing

Want to resell PuckHub or offer it as a service? Contact me for commercial licensing options:

**Sascha Grüßhaber**
📧 Email: sascha@gruesshaber.eu
🔗 GitHub: [@sascha-gruesshaber](https://github.com/sascha-gruesshaber)

**Read the full license:** [LICENSE.md](LICENSE.md)


## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) and [Contributor License Agreement](CLA.md) before submitting pull requests.

**Ways to contribute:**
- 🐛 Report bugs
- 💡 Suggest features
- 📝 Improve documentation
- 🌍 Enhance translations (German/English)
- 🔧 Submit bug fixes or improvements

## Support

- **Documentation**: See package-level `CLAUDE.md` files in `apps/` and `packages/`
- **Issues**: [GitHub Issues](https://github.com/sascha-gruesshaber/puckhub/issues)
- **Discussions**: [GitHub Discussions](https://github.com/sascha-gruesshaber/puckhub/discussions)
- **Contact**: sascha@gruesshaber.eu

---

**PuckHub** — Professional ice hockey league management system
Copyright © 2025-2026 Sascha Grüßhaber. All rights reserved.
Licensed under [Custom Source-Available License](LICENSE.md)
