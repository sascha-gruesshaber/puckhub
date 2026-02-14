# @puckhub/admin

TanStack Start (React 19) admin application with Vite 7, file-based routing, tRPC integration, and i18n (DE/EN).

## Route Structure (26 routes)

```
src/routes/
├── __root.tsx              # Root layout (providers, fonts)
├── login.tsx               # Public login page
├── setup.tsx               # First-time setup wizard
└── _authed.tsx             # Protected layout (sidebar, session check, season context)
    ├── index.tsx           # Dashboard
    ├── settings.tsx        # League settings
    ├── standings.tsx       # Standings view
    ├── stats.tsx           # Statistics
    ├── games/index.tsx     # Games calendar + scheduling
    ├── games/$gameId/report.tsx  # Game report editor (lineups, events, suspensions)
    ├── seasons/index.tsx   # Seasons list
    ├── seasons/$seasonId/structure.tsx  # Season structure builder (React Flow)
    ├── seasons/$seasonId/roster.tsx     # Roster management
    ├── teams/index.tsx     # Teams
    ├── players/index.tsx   # Players list
    ├── players/$playerId/history.tsx    # Player timeline
    ├── venues/index.tsx    # Venues management
    ├── trikots/index.tsx   # Jersey management
    ├── news/index.tsx      # News list
    ├── news/new.tsx        # Create news article
    ├── news/$newsId/edit.tsx  # Edit news article
    ├── pages/index.tsx     # CMS pages list
    ├── pages/new.tsx       # Create page
    ├── pages/$pageId/edit.tsx  # Edit page
    ├── sponsors/index.tsx  # Sponsors management
    └── users/index.tsx     # User management
```

- `_authed.tsx` wraps all protected routes — checks session, redirects to `/login` if unauthenticated
- `routeTree.gen.ts` is **auto-generated** by `@tanstack/router-plugin` — never edit manually
- Navigation labels are translated via i18n (German primary, English available)

## Path Aliases

- `~/` → `src/` (components, routes, hooks)
- `@/` → `lib/` (auth-client, trpc, utilities)

## Key Imports

```ts
import { authClient, signIn, signOut, useSession } from '@/auth-client'
import { trpc } from '@/trpc'
import { useTranslation } from '~/i18n/use-translation'
```

- **Auth**: Better Auth React client → base URL `VITE_API_URL` or `http://localhost:3001`
- **tRPC**: React Query integration with httpBatchLink, superjson, credentials: 'include'
- **API endpoint**: `{VITE_API_URL}/api/trpc`
- **i18n**: `useTranslation()` hook returns `t()` function for current locale

## i18n

```
src/i18n/
├── locales/
│   ├── de-DE/common.json   # German translations (~1300 lines)
│   ├── de-DE/errors.json   # German error messages
│   ├── en-US/common.json   # English translations (~1300 lines)
│   └── en-US/errors.json   # English error messages
├── resources.ts             # Resource imports & locale normalization
├── common.content.ts        # Common content type definitions
├── errors.content.ts        # Error content type definitions
├── content-utils.ts         # Content utility functions
└── use-translation.ts       # useTranslation() hook
```

- **Locales**: `de-DE` (primary), `en-US`
- **Namespaces**: `common` (all UI text), `errors` (error messages)
- User locale preference stored in DB and synced via `locale-sync.tsx` component

## Component Organization (~60 files)

```
src/components/
├── getting-started/       # Setup wizard (WelcomeStep → CompleteStep)
├── game-report/           # Game report editing (10 components)
│   ├── GameReportHeader.tsx
│   ├── GameTimeline.tsx   # Chronological event timeline
│   ├── GoalDialog.tsx     # Add/edit goals
│   ├── PenaltyDialog.tsx  # Add/edit penalties
│   ├── SuspensionDialog.tsx  # Add/edit suspensions
│   ├── SuspensionWarnings.tsx  # Active suspension alerts
│   ├── LineupEditor.tsx   # Manage game lineups
│   ├── TeamRosterChecklist.tsx  # Player checklist for lineup
│   └── TimelineEvent.tsx  # Single event in timeline
├── structure-builder/     # React Flow canvas for season structure
│   ├── StructureCanvas.tsx
│   ├── nodes/             # Custom node types (Season, Division, Round, Team)
│   ├── panels/            # Side panel, DivisionEdit, RoundEdit, TeamAssignment, TeamPalette
│   └── utils/             # Layout, node factory, color mapping, round-type-icons
├── player-timeline/       # Player history timeline
├── roster/                # Roster management (RosterTable, Sign/Edit/Transfer dialogs)
├── calendar-export-dialog.tsx  # iCal export dialog
├── player-combobox.tsx    # Player search/select combobox
├── team-combobox.tsx      # Team search/select combobox
├── team-filter-pills.tsx  # Team filter pill badges
├── unscheduled-games-sidebar.tsx  # Sidebar listing unscheduled games
├── data-page-layout.tsx   # Standard data page layout wrapper
├── page-header.tsx        # Reusable page header
├── empty-state.tsx        # Empty state placeholder
├── no-results.tsx         # No search results state
├── confirm-dialog.tsx     # Confirmation modal
├── search-input.tsx       # Search input
├── filter-pill.tsx        # Filter pill component
├── image-upload.tsx       # Image upload (logo/photo)
├── rich-text-editor.tsx   # Rich text editor (Tiptap)
├── trikot-preview.tsx     # Jersey preview
├── team-hover-card.tsx    # Team hover card
├── player-hover-card.tsx  # Player hover card
├── hover-card.tsx         # Generic hover card
├── season-indicator.tsx   # Season indicator badge
├── season-picker-modal.tsx # Season selection modal
├── locale-sync.tsx        # Locale synchronization
├── language-picker.tsx    # Language picker (DE/EN)
├── news-form.tsx          # News article form
└── page-form.tsx          # Page content form
```

## Contexts

```
src/contexts/
└── season-context.tsx     # Current season selection (used in _authed.tsx layout)
```

## State Management

- **Server state**: tRPC queries via React Query (`trpc.season.list.useQuery()`)
- **Season context**: React context in `_authed.tsx` for current season selection
- **Local storage**: Season picker preference persisted across sessions
- **No global state library** — compose tRPC + context + local state

## E2E Testing

- **Framework**: Playwright (Chromium only)
- **Test dir**: `e2e/`
- **Ports**: Admin on 4000, API on 4001 (separate from dev)
- **Isolation**: `globalSetup` / `globalTeardown` handle test DB via testcontainers
- **Run**: `pnpm test:e2e`
