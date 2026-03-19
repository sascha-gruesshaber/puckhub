# @puckhub/admin

TanStack Start (React 19) admin application with Vite 7, file-based routing, tRPC integration, i18n (DE/EN), magic link authentication, and AI content generation (recaps, SEO, home widgets).

## Route Structure (29 routes)

All org-scoped routes use `$orgSlug/` prefix for multi-org navigation.

```
src/routes/
├── __root.tsx              # Root layout (providers, fonts)
├── login.tsx               # Magic link login (email + passkey + 2FA)
├── version.ts              # Version API endpoint
└── _authed.tsx             # Protected layout (session check)
    ├── index.tsx           # Org picker / redirect
    └── $orgSlug.tsx        # Org-scoped layout (sidebar, season/org context)
        ├── index.tsx           # Dashboard
        ├── profile.tsx         # User profile (name, language, 2FA, passkeys)
        ├── settings.tsx        # League settings + AI feature configuration (recaps, SEO, home widgets)
        ├── website.tsx         # Website builder (subdomain/domain config, theme, preview)
        ├── games/index.tsx     # Games calendar + scheduling
        ├── games/public-reports.tsx  # Public game reports review (approve/revert)
        ├── games/$gameId/report.tsx  # Game report editor (lineups, events, suspensions, AI recap)
        ├── seasons/index.tsx   # Seasons list
        ├── seasons/$seasonId/structure.tsx  # Season structure builder (React Flow)
        ├── seasons/$seasonId/roster.tsx     # Roster management
        ├── teams/index.tsx     # Teams
        ├── teams/$teamId.tsx   # Team detail page
        ├── players/index.tsx   # Players list
        ├── players/$playerId.tsx  # Player detail page
        ├── trikots/index.tsx   # Jersey management (PRO)
        ├── news/index.tsx      # News list
        ├── news/new.tsx        # Create news article
        ├── news/$newsId/edit.tsx  # Edit news article
        ├── pages/index.tsx     # CMS pages (drag-and-drop, hierarchies, system routes)
        ├── pages/new.tsx       # Create page
        ├── pages/$pageId/edit.tsx  # Edit page
        ├── sponsors/index.tsx  # Sponsors management (PRO)
        └── users/index.tsx     # User & role management (team-scoped roles)
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

- **Auth**: Better Auth React client with magic link, passkey, 2FA, and organization plugins → base URL `VITE_API_URL` or `http://api.puckhub.localhost`
- **tRPC**: React Query integration with httpBatchLink, superjson, credentials: 'include'
- **API endpoint**: `{VITE_API_URL}/api/trpc`
- **i18n**: `useTranslation()` hook returns `t()` function for current locale

## i18n

```
src/i18n/
├── locales/
│   ├── de-DE/common.json   # German translations
│   ├── de-DE/errors.json   # German error messages
│   ├── en-US/common.json   # English translations
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

## Component Organization (~76 files)

```
src/components/
├── auth/                  # Authentication components
│   ├── loginForm.tsx      # Magic link email form
│   ├── passkeyButton.tsx
│   └── twoFactorForm.tsx
├── gameReport/            # Game report editing (11 components + 1 CSS)
│   ├── gameReportHeader.tsx  # Enhanced header with team logos, score, AI recap section
│   ├── gameTimeline.tsx   # Chronological event timeline
│   ├── goalSheet.tsx      # Add/edit goals (Sheet)
│   ├── penaltySheet.tsx   # Add/edit penalties (Sheet)
│   ├── suspensionSheet.tsx  # Add/edit suspensions (Sheet)
│   ├── noteSheet.tsx      # Add/edit game notes (Sheet)
│   ├── suspensionWarnings.tsx  # Active suspension alerts
│   ├── gameSuspensionList.tsx  # Multi-game suspension list
│   ├── lineupEditor.tsx   # Manage game lineups
│   ├── teamRosterChecklist.tsx  # Player checklist for lineup
│   └── timelineEvent.tsx  # Single event in timeline
├── player/                # Player components
│   └── playerInfoCard.tsx # Player info card for detail page
├── roster/                # Roster management (5 files)
│   ├── rosterTable.tsx
│   ├── signPlayerSheet.tsx
│   ├── editContractSheet.tsx
│   ├── releasePlayerSheet.tsx
│   └── transferSheet.tsx
├── security/              # Security settings (2 files)
│   ├── passkeySection.tsx
│   └── twoFactorSection.tsx
├── skeletons/             # Loading skeleton components (4 files)
│   ├── countSkeleton.tsx
│   ├── dataListSkeleton.tsx
│   ├── detailPageSkeleton.tsx
│   └── filterPillsSkeleton.tsx
├── structureBuilder/      # React Flow canvas for season structure (13 files)
│   ├── structureCanvas.tsx
│   ├── setupWizardDialog.tsx
│   ├── nodes/             # Custom node types (seasonNode, divisionNode, roundNode, teamNode)
│   ├── panels/            # sidePanel, divisionEditPanel, roundEditPanel, teamAssignmentPanel, teamPalette
│   └── utils/             # layout, nodeFactory, roundTypeColors, roundTypeIcons
├── confirmDialog.tsx      # Confirmation modal
├── dangerZone.tsx         # Danger zone section for destructive actions
├── dataPageLayout.tsx     # Standard data page layout wrapper
├── detailPageLayout.tsx   # Detail page layout with back navigation
├── emptyState.tsx         # Empty state placeholder
├── featureGate.tsx        # Plan-based feature gating
├── filterBar.tsx          # Filter bar wrapper
├── filterDropdown.tsx     # Filter dropdown component
├── filterPill.tsx         # Filter pill component
├── gameStatusBadge.tsx    # Game status badge
├── hoverCard.tsx          # Generic hover card
├── imageUpload.tsx        # Image upload (logo/photo)
├── languagePicker.tsx     # Language picker (DE/EN)
├── localeSync.tsx         # Locale synchronization
├── newsForm.tsx           # News article form
├── noResults.tsx          # No search results state
├── orgPickerPage.tsx      # Organization picker page
├── orgSwitcher.tsx        # Organization switcher
├── pageForm.tsx           # Page content form (with slug generation)
├── pageHeader.tsx         # Reusable page header
├── pageSkeleton.tsx       # Full-page loading skeleton
├── playerCombobox.tsx     # Player search/select combobox
├── removeDialog.tsx       # Remove confirmation dialog
├── richTextEditor.tsx     # Rich text editor (Tiptap)
├── richTextEditorLazy.tsx # Lazy-loaded rich text editor
├── roundGroupSelect.tsx   # Round/group selection dropdown
├── searchInput.tsx        # Search input
├── seasonIndicator.tsx    # Season indicator badge
├── seasonPickerModal.tsx  # Season selection modal
├── teamCombobox.tsx       # Team search/select combobox
├── teamFilterPills.tsx    # Team filter pill badges
├── tabNavigation.tsx      # Tab navigation component
├── topBar.tsx             # Top navigation bar (with AI usage indicator)
├── trikotPreview.tsx      # Jersey preview
└── upgradeBanner.tsx      # Plan upgrade prompt banner
```

## Hooks

```
src/hooks/
├── usePlanLimits.ts         # Plan limit checking for feature gates
└── useStructureOptions.tsx  # Season structure dropdown options
```

## Contexts

```
src/contexts/
├── mobileSidebarContext.tsx # Mobile sidebar open/close state
├── organizationContext.tsx  # Current organization selection and switching
├── permissionsContext.tsx   # Role-based permissions for current org member
└── seasonContext.tsx        # Current season selection (used in _authed.tsx layout)
```

## Lib

```
lib/                       # @/ alias target (at app root, outside src/)
├── auth-client.ts         # Better Auth React client configuration
└── trpc.ts                # tRPC React Query client configuration

src/lib/                   # Inside src/
├── colorUtils.ts          # Color manipulation utilities
├── errorI18n.ts           # Error code to i18n key mapping
└── search-params.ts       # FILTER_ALL constant for URL-based filtering
```

## State Management

- **Server state**: tRPC queries via React Query (`trpc.season.list.useQuery()`)
- **Season context**: React context in `_authed.tsx` for current season selection
- **Page filters**: URL search params via TanStack Router (replaced Zustand stores)
- **Local storage**: Season picker preference persisted across sessions
- **No global state library** — compose tRPC + context + URL search params

## Key Features

- **Magic Link Authentication**: Email-based passwordless login with passkey and 2FA support
- **AI Content Generation**: Game recaps, news/page SEO, season descriptions, and home page widgets via OpenRouter (Gemini), with granular per-feature toggles and token budget tracking
- **Pages CMS**: Drag-and-drop page builder with parent-child hierarchies, system routes, and URL aliases
- **Team-Scoped Roles**: owner, admin, game_manager, game_reporter, team_manager, editor — some scoped to specific teams
- **Public Game Reports**: Community-submitted game scores with email OTP verification, bot detection (math captcha + honeypot), admin review/revert with audit trail
- **Feature Gating**: PRO features (trikots, sponsors, website builder, AI recaps, public reports) locked behind plan limits

## E2E Testing

- **Framework**: Playwright (Chromium only)
- **Test dir**: `e2e/` (12 spec files + 1 helper)
- **Specs**: `auth`, `game-report`, `games`, `navigation`, `news`, `pages`, `players`, `public-reports`, `seasons`, `settings`, `teams`, `trikots`, `users`
- **Ports**: Admin on 4000, API on 4001 (separate from dev)
- **Isolation**: Root `e2e/global-setup.ts` / `e2e/global-teardown.ts` handle test DB via testcontainers (shared across all apps)
- **Run**: `pnpm test:e2e` or `pnpm test:e2e:admin`
