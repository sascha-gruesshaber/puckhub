# @puckhub/platform

TanStack Start (React 19) platform admin dashboard for managing the PuckHub SaaS platform globally. Runs on port 3002.

## Route Structure (9 routes)

```
src/routes/
├── __root.tsx              # Root layout (tRPC + React Query providers)
├── login.tsx               # Public login page
└── _authed.tsx             # Protected layout (sidebar, admin role check)
    ├── index.tsx           # Dashboard (stats overview, league list)
    ├── profile.tsx         # User profile (name, email)
    ├── settings.tsx        # Redirects to /profile
    ├── users.tsx           # Global user management
    ├── jobs.tsx            # Scheduled cron job monitoring
    ├── plans.tsx           # Subscription plan management
    └── organizations/
        └── index.tsx       # League (organization) management
```

- `_authed.tsx` checks for platform admin role (`user.role === 'admin'`), redirects to `/login` if unauthenticated
- `routeTree.gen.ts` is **auto-generated** by `@tanstack/router-plugin` — never edit manually

## Path Aliases

- `~/` -> `src/` (components, routes)
- `@/` -> `lib/` (auth-client, trpc)

## Key Imports

```ts
import { authClient, signIn, signOut, useSession } from '@/auth-client'
import { trpc } from '@/trpc'
```

- **Auth**: Better Auth React client with organization + admin plugins
- **tRPC**: React Query integration with httpBatchLink, superjson, credentials: 'include'
- **API endpoint**: `{VITE_API_URL}/api/trpc` (default `http://api.puckhub.localhost`)

## Components

```
src/components/
└── topBar.tsx             # Header bar with platform branding and user menu (uses DropdownMenu from @puckhub/ui)
```

## Contexts

```
src/contexts/
└── mobileSidebarContext.tsx  # Mobile sidebar open/close state
```

## Lib

```
lib/                       # @/ alias target (at app root, outside src/)
├── auth-client.ts         # Better Auth client (organization + admin plugins)
└── trpc.ts                # tRPC React Query client configuration
```

## Key Features by Route

| Route | Feature | Key tRPC Calls |
|-------|---------|----------------|
| Dashboard (`/`) | Stats overview, league list, member counts | `trpc.organization.listAll`, `trpc.users.listAll` |
| Leagues (`/organizations`) | Create/delete leagues, export/import data, login-as | `trpc.organization.create/delete/setActiveForAdmin`, `trpc.leagueTransfer.export/import` |
| Users (`/users`) | Global user search, delete, assign/remove from leagues, role management | `trpc.users.listAll/deleteGlobal/addToOrganization/removeFromOrganization` |
| Jobs (`/jobs`) | Monitor cron jobs, view history, trigger manually | `trpc.scheduler.list`, `trpc.scheduler.trigger` |
| Plans (`/plans`) | Manage subscription plans (tiers, pricing, feature flags, AI token limits) | `trpc.plan.list/create/update/delete` |
| Profile (`/profile`) | Update name | `authClient.updateUser()` |

## E2E Testing

- **Framework**: Playwright (Chromium only)
- **Test dir**: `e2e/` (1 spec file)
- **Specs**: `auth-redirect`
- **Isolation**: Root `e2e/global-setup.ts` / `e2e/global-teardown.ts` (shared across all apps)
- **Run**: `pnpm test:e2e:platform`

## Styling

- **Framework**: Tailwind CSS
- **Custom CSS**: `src/styles/dataList.css` (data row animations)
- **UI Library**: `@puckhub/ui` (shared components)
- **Fonts**: Outfit (Google Fonts, configured in `__root.tsx`)
