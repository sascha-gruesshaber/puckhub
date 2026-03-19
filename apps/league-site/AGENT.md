# @puckhub/league-site

TanStack Start (React 19) public league frontend with Vite 7, tRPC integration, localized German/English routes, and ECharts visualizations. Served on wildcard subdomains (`*.puckhub.localhost`, port 3003).

## Route Structure

```
src/routes/
├── __root.tsx              # Root layout (tRPC + React Query providers, org/settings context)
├── index.tsx               # Home page (hero, game ticker, standings snippet, news, sponsors)
├── standings.tsx           # Standings table with division/round navigation
├── structure.tsx           # Season structure overview (divisions, rounds, team assignments)
├── $slug.tsx               # Dynamic CMS page route (single-level slugs)
├── $parentSlug/
│   └── $childSlug.tsx      # Nested CMS page route (parent/child slugs)
├── version.ts              # Version API endpoint (app name, version, commit)
├── schedule/
│   ├── index.tsx           # Schedule with filters (round, team, status), grouped by date
│   └── $gameId.tsx         # Game detail (events, lineups, AI recap)
├── news/
│   ├── $newsId.tsx         # News article detail (fallback, redirects to slug URL)
│   └── $newsId.$slug.tsx   # News article with SEO slug URL
├── players/
│   ├── $playerId.tsx       # Player detail (fallback, redirects to slug URL)
│   └── $playerId.$slug.tsx # Player detail with SEO slug URL
├── teams/
│   ├── index.tsx           # Teams list
│   ├── $teamId.tsx         # Team detail (fallback, redirects to slug URL)
│   └── $teamId.$slug.tsx   # Team detail with SEO slug URL (roster, history tab)
├── stats/
│   ├── index.tsx           # Redirect to first available stats page
│   ├── scorers.tsx         # Top scorers table + chart
│   ├── goals.tsx           # Goal statistics
│   ├── assists.tsx         # Assist statistics
│   ├── goalies.tsx         # Goalie stats (qualified/below-threshold)
│   ├── penalties.tsx       # Penalty stats by player
│   ├── compare-teams.tsx   # Advanced: team comparison radar/bar charts (advancedStats only)
│   ├── players/$playerId.tsx      # Player career stats (fallback)
│   ├── players/$playerId.$slug.tsx  # Player career stats with SEO slug URL
│   └── teams/$teamId.tsx   # Redirect → /teams/$teamId?tab=history
```

**German route aliases** are not file-based — they are registered programmatically via `src/lib/germanRoutes.ts` using `registerGermanRoutes(rootRoute)`. This single source of truth maps English canonical paths to German equivalents at runtime.

## Localized Routes

`src/lib/germanRoutes.ts` defines all German alias routes (single source of truth). `src/lib/localizedRoutes.ts` provides `useLocalePath()` and `allPathVariants()` helpers.

Mappings:
- `/standings` ↔ `/tabelle`
- `/schedule` ↔ `/spielplan`
- `/structure` ↔ `/struktur`
- `/news` ↔ `/neuigkeiten`
- `/stats/*` ↔ `/statistiken/*`

German routes are registered programmatically on the root route (lazy-loaded components, search param passthrough). `useLocalePath()` resolves the correct path based on org locale. `allPathVariants()` returns both variants for a given path.

## Component Organization

```
src/components/
├── charts/                # ECharts visualizations (lazy-loaded)
│   ├── echartsWrapper.tsx         # Themed wrapper for echarts-for-react
│   ├── scorerChart.tsx            # Top scorers bar chart
│   ├── goalieChart.tsx            # Goalie performance chart
│   ├── penaltyTeamChart.tsx       # Team penalty breakdown
│   ├── penaltyTypeChart.tsx       # Penalty type distribution
│   ├── seasonProgressionCharts.tsx  # Multi-season player progression
│   ├── teamProgressionCharts.tsx  # Team historical progression (lazy)
│   ├── teamComparisonBar.tsx      # Team comparison bar chart
│   ├── teamComparisonProgression.tsx # Team comparison progression over time
│   ├── teamComparisonRadar.tsx    # Team comparison radar chart
│   └── teamComparisonSelector.tsx # Team selection for comparison
├── stats/                 # Stats page components
│   ├── statsPageShell.tsx         # Layout shell with season picker
│   ├── statsTables.tsx            # Shared PlayerTable, GoalieSection, ChartSuspense
│   ├── allTimeStats.tsx           # Career/all-time statistics
│   ├── careerStatsSummary.tsx     # Summary card for career stats
│   ├── playerCareerTimeline.tsx   # Player career timeline across seasons
│   ├── playerSeasonStatsTable.tsx # Player season stats table
│   ├── seasonTimeline.tsx         # Season timeline visualization
│   └── playerTimeline.tsx         # Player timeline
├── shared/                # Reusable UI components
│   ├── filterBar.tsx              # Filter bar wrapper
│   ├── filterDropdown.tsx         # Multi-select/single-select dropdown
│   ├── filterPill.tsx             # Toggle pill buttons
│   ├── roundNavigator.tsx         # Division/round navigation
│   ├── teamSelect.tsx             # Team selector with logos
│   ├── statsSummaryCards.tsx      # Top stats summary cards
│   ├── statusBadge.tsx            # Game/entity status badges
│   ├── scoreBadge.tsx             # Score display badge
│   ├── pillTabs.tsx               # Pill-style tab switcher
│   ├── inlineSelect.tsx           # Inline select dropdown
│   ├── htmlContent.tsx            # Rendered HTML content block
│   ├── hoverCard.tsx              # Generic hover card
│   ├── emptyState.tsx
│   ├── gameCard.tsx
│   ├── newsCard.tsx               # News article card
│   ├── loadingSkeleton.tsx        # Loading skeleton component
│   ├── playerHoverCard.tsx
│   ├── teamHoverCard.tsx
│   ├── publicReportForm.tsx        # Public game report form (score submission + email OTP + bot detection)
│   ├── teamChipRow.tsx            # Team chip/tag row
│   └── teamLogo.tsx
└── layout/
    ├── siteHeader.tsx             # Desktop dropdown + mobile hamburger nav
    ├── siteFooter.tsx             # Sponsor bar + footer links
    ├── siteLayout.tsx             # Page layout wrapper
    ├── sectionWrapper.tsx         # Section container wrapper
    └── teamsMegaDropdown.tsx      # Hover-triggered mega dropdown for quick team navigation (4-column grid with logos)
```

## Hooks

```
src/hooks/
├── useSubRouteVisible.ts  # Checks if a sub-route page is published via menu pages cache
└── useFilterNavigate.ts   # Search-param-only navigation with scroll preservation (replace: true)
```

## Lib

```
src/lib/
├── germanRoutes.ts        # German route alias definitions + programmatic registration
├── localizedRoutes.ts     # useLocalePath(), allPathVariants() helpers
├── i18n.ts                # Internationalization utilities
├── context.ts             # Org/settings React context
├── theme.ts               # Theme configuration
└── utils.ts               # formatDate/DateTime/Time (locale-aware), useBackPath hook

lib/
├── env.ts                 # getApiUrl() (subdomain-aware), getMarketingUrl()
└── trpc.ts                # tRPC React Query client
```

## Feature Gating

- `advancedStats` feature flag controls: compare-teams, team/player history, hover cards, charts
- `publicReports` feature flag controls: public game report submission form on game detail pages
- Pages gracefully degrade without advanced stats — routes hidden from nav, components not rendered
- `useSubRouteVisible()` hook checks if individual sub-routes are published

## Key Patterns

- **Localized route aliasing**: German routes registered programmatically via `germanRoutes.ts` (not separate files)
- **Lazy loading**: Charts and team progression components lazy-loaded for bundle optimization
- **Infinite pagination**: News and schedule pages support cursor-based infinite scroll
- **Responsive design**: Desktop tables with mobile card variants, sticky headers
- **StatsPageShell**: Common wrapper with season picker (pills for ≤4 seasons, select for >4)
- **AI Content Display**: Game detail shows AI-generated recap (lazy generation), home page shows AI widgets (League Pulse Digest, Headlines Ticker) when enabled
- **CMS Pages**: Dynamic `$slug` and `$parentSlug/$childSlug` routes render user-created pages from the admin CMS
- **SEO Slug URLs**: Entity detail pages use `$id.$slug` pattern (e.g., `/teams/abc123.eishockey-club`) for SEO-friendly URLs. ID-only routes redirect to the slug variant. Dynamic page titles set via TanStack Router's `useEffect` + `document.title`

## E2E Testing

- **Framework**: Playwright (Chromium only)
- **Test dir**: `e2e/` (7 spec files)
- **Specs**: `home`, `localized-routes`, `news`, `schedule`, `standings`, `stats`, `teams`
- **Isolation**: Root `e2e/global-setup.ts` / `e2e/global-teardown.ts` handle test DB (shared across all apps)
- **Run**: `pnpm test:e2e:league`
