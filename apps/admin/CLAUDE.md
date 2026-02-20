# @puckhub/admin

TanStack Start (React 19) admin application with Vite 7, file-based routing, tRPC integration, and i18n (DE/EN).

## Route Structure (27 routes)

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
    ├── users/index.tsx     # User management
    └── security.tsx        # Security settings
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
├── locale-context.tsx       # LocaleProvider context, useLocale() hook
└── use-translation.ts       # useTranslation() hook → t() function
```

- **Approach**: JSON locale files imported statically, flattened into a `Map` cache for fast dot-notation lookups
- **Context**: `LocaleProvider` in root layout provides current locale; `useLocale()` hook to read/change it
- **Locales**: `de-DE` (primary), `en-US`
- **Namespaces**: `common` (all UI text), `errors` (error messages)
- User locale preference stored in DB and synced via `localeSync.tsx` component

## Component Organization (~65 files)

```
src/components/
├── gettingStarted/        # Setup wizard
│   ├── gettingStartedWizard.tsx
│   ├── wizardLayout.tsx
│   ├── stepIndicator.tsx
│   └── steps/             # welcomeStep, leagueOverviewStep, adminAccountStep, firstSeasonStep, completeStep
├── gameReport/            # Game report editing (10 components)
│   ├── gameReportHeader.tsx
│   ├── gameTimeline.tsx   # Chronological event timeline
│   ├── goalDialog.tsx     # Add/edit goals
│   ├── penaltyDialog.tsx  # Add/edit penalties
│   ├── suspensionDialog.tsx  # Add/edit suspensions
│   ├── suspensionWarnings.tsx  # Active suspension alerts
│   ├── gameSuspensionList.tsx  # Multi-game suspension list
│   ├── lineupEditor.tsx   # Manage game lineups
│   ├── teamRosterChecklist.tsx  # Player checklist for lineup
│   └── timelineEvent.tsx  # Single event in timeline
├── structureBuilder/      # React Flow canvas for season structure
│   ├── structureCanvas.tsx
│   ├── setupWizardDialog.tsx
│   ├── nodes/             # Custom node types (seasonNode, divisionNode, roundNode, teamNode)
│   ├── panels/            # sidePanel, divisionEditPanel, roundEditPanel, teamAssignmentPanel, teamPalette
│   └── utils/             # layout, nodeFactory, roundTypeColors, roundTypeIcons
├── playerTimeline/        # Player history timeline (playerTimeline.tsx)
├── roster/                # Roster management (rosterTable, signPlayerDialog, editContractDialog, transferDialog)
├── skeletons/             # Loading skeleton components
│   ├── countSkeleton.tsx
│   ├── dataListSkeleton.tsx
│   └── filterPillsSkeleton.tsx
├── playerCombobox.tsx     # Player search/select combobox
├── teamCombobox.tsx       # Team search/select combobox
├── teamFilterPills.tsx    # Team filter pill badges
├── dataPageLayout.tsx     # Standard data page layout wrapper
├── pageHeader.tsx         # Reusable page header
├── emptyState.tsx         # Empty state placeholder
├── noResults.tsx          # No search results state
├── confirmDialog.tsx      # Confirmation modal
├── searchInput.tsx        # Search input
├── filterPill.tsx         # Filter pill component
├── imageUpload.tsx        # Image upload (logo/photo)
├── richTextEditor.tsx     # Rich text editor (Tiptap)
├── richTextEditorLazy.tsx # Lazy-loaded rich text editor
├── pageSkeleton.tsx       # Full-page loading skeleton
├── trikotPreview.tsx      # Jersey preview
├── teamHoverCard.tsx      # Team hover card
├── playerHoverCard.tsx    # Player hover card
├── hoverCard.tsx          # Generic hover card
├── gameStatusBadge.tsx    # Game status badge
├── seasonIndicator.tsx    # Season indicator badge
├── seasonPickerModal.tsx  # Season selection modal
├── localeSync.tsx         # Locale synchronization
├── languagePicker.tsx     # Language picker (DE/EN)
├── newsForm.tsx           # News article form
└── pageForm.tsx           # Page content form
```

## Contexts

```
src/contexts/
└── season-context.tsx     # Current season selection (used in _authed.tsx layout)
```

## Lib

```
src/lib/
├── errorI18n.ts        # Error code to i18n key mapping
└── search-params.ts    # FILTER_ALL constant for URL-based filtering
```

## State Management

- **Server state**: tRPC queries via React Query (`trpc.season.list.useQuery()`)
- **Season context**: React context in `_authed.tsx` for current season selection
- **Page filters**: URL search params via TanStack Router (replaced Zustand stores)
- **Local storage**: Season picker preference persisted across sessions
- **No global state library** — compose tRPC + context + URL search params

## E2E Testing

- **Framework**: Playwright (Chromium only)
- **Test dir**: `e2e/`
- **Ports**: Admin on 4000, API on 4001 (separate from dev)
- **Isolation**: `globalSetup` / `globalTeardown` handle test DB via testcontainers
- **Run**: `pnpm test:e2e`
