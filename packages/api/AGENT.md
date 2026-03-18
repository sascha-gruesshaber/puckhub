# @puckhub/api

Hono HTTP server with tRPC routers, Better Auth (magic link + passkey + 2FA), AI recap service, and email infrastructure. Runs on port 3001.

## Architecture

```
src/
├── index.ts           # Entry point — loads env, auto-migrates, starts server
├── app.ts             # Hono app — CORS, auth routes, tRPC mount, uploads, health
├── lib/
│   ├── auth.ts        # Better Auth config (magic link, passkey, 2FA, 7-day sessions)
│   ├── ensureDefaultUser.ts  # Creates default admin on first startup (magic link, no password)
│   ├── email.ts       # SMTP via nodemailer (falls back to console if unconfigured)
│   └── emailTemplates.ts  # HTML email templates (magic link, invite, OTP, report reverted, contact OTP, contact notification)
├── errors/
│   ├── appError.ts    # createAppError, inferAppErrorCode functions
│   └── codes.ts       # APP_ERROR_CODES enum (72 error codes)
├── routes/
│   └── upload.ts      # File upload handler (POST /api/upload)
├── services/
│   ├── aiRecapService.ts          # AI game recap generation (OpenRouter + Gemini)
│   ├── ensureSystemPages.ts       # Auto-provision system pages for organizations
│   ├── planLimits.ts              # Plan limit checking and enforcement
│   ├── schedulerService.ts        # Round-robin game scheduling logic
│   └── leagueTransfer/            # League data export/import
│       ├── index.ts               # Service entry point
│       ├── schema.ts              # Transfer data schema
│       ├── export.ts              # Export logic
│       ├── import.ts              # Import logic
│       ├── validate.ts            # Validation logic
│       ├── registry.ts            # Entity registry
│       └── attachments.ts         # Attachment handling
└── trpc/
    ├── init.ts        # tRPC init, middleware, procedure types
    ├── context.ts     # Request context (db, session, user)
    ├── client.ts      # AppRouter type export
    ├── index.ts       # Root router composition (appRouter)
    └── routers/       # 32 feature routers
```

## HTTP Routes

| Method | Path | Handler |
|--------|------|---------|
| `*` | `/api/auth/**` | Better Auth (magic link, passkey, 2FA, session) |
| `*` | `/api/trpc/*` | tRPC handler |
| `POST` | `/api/upload` | File upload (logo/photo, max 5MB, images only) |
| `GET` | `/api/uploads/*` | Static file serving |
| `GET` | `/api/domain-check` | Domain validation for Caddy on-demand TLS (checks `WebsiteConfig`) |
| `POST` | `/api/webhooks/stripe` | Stripe webhook endpoint (stub) |
| `GET` | `/api/health` | Health check |

## Routers (32)

`aiRecap` · `bonusPoints` · `contactForm` · `contract` · `dashboard` · `division` · `game` · `gameReport` · `leagueTransfer` · `news` · `organization` · `page` · `plan` · `player` · `publicGameReport` · `publicSite` · `round` · `scheduler` · `season` · `settings` · `sponsor` · `standings` · `stats` · `subscription` · `team` · `teamDivision` · `teamTrikot` · `trikot` · `trikotTemplate` · `userPreferences` · `users` · `websiteConfig`

## Procedure Types

```ts
publicProcedure        // No auth — use for read-only public data
protectedProcedure     // Requires authenticated session (isAuthed middleware)
orgProcedure           // Requires session + active org + loads member roles (withOrgRoles middleware)
orgAdminProcedure      // Requires session + owner/admin role in org (isOrgAdmin middleware)
adminProcedure         // Alias for orgAdminProcedure (migration convenience)
platformAdminProcedure // Requires user.role === 'admin' at platform level (isPlatformAdmin middleware)
```

Most mutations use `adminProcedure` (org-scoped). Public queries for standings/stats use `publicProcedure`. `orgProcedure` provides role context (`orgRole`, `memberRoles`, `hasRole()`) without requiring admin.

## Error Handling

Errors use `createAppError()` with typed error codes from `src/errors/codes.ts`. The tRPC error formatter attaches `appErrorCode` to responses for i18n-based error display on the frontend.

## Adding a New Router

1. Create `src/trpc/routers/{name}.ts`
2. Import `router`, `adminProcedure` (or appropriate type) from `../init`
3. Define procedures with Zod input validation
4. Export the router
5. Add to `appRouter` in `src/trpc/index.ts`

Pattern:
```ts
import { z } from 'zod'
import { router, adminProcedure } from '../init'

export const myRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.team.findMany({ orderBy: { name: 'asc' } })
  }),
  create: adminProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.team.create({ data: input })
    }),
})
```

## Services

| Service | File | Purpose |
|---------|------|---------|
| AI Recap | `services/aiRecapService.ts` | Generate game recaps via OpenRouter (Gemini). 4-layer eligibility guard (not demo, aiEnabled, plan feature, token budget). Monthly token tracking per org. Fire-and-forget async generation with optimistic locking. |
| System Pages | `services/ensureSystemPages.ts` | Auto-provision required league site pages (home, standings, schedule, structure, etc.) on org creation. Locale-aware (DE/EN). Idempotent. |
| Plan Limits | `services/planLimits.ts` | Check and enforce plan limits (maxTeams, maxPlayers, maxAdmins, etc.) |
| Email | `lib/email.ts` | SMTP via nodemailer. Falls back to console logging in dev when SMTP unconfigured. |
| Public Report Privacy | `lib/publicReportPrivacy.ts` | Email/IP hashing and masking for GDPR compliance. Pure functions: normalize, mask, hash email/IP. |
| Scheduler | `lib/scheduler.ts` | Cron-based job scheduling and management. |
| Email Templates | `lib/emailTemplates.ts` | HTML templates: magic link sign-in, user invitation, OTP verification, report reverted notification, contact OTP, contact notification. Modern responsive design with reusable component functions, MSO compatibility. |

## Testing

- **Framework**: Vitest
- **Per-test DB isolation**: Each test gets a fresh PostgreSQL database (cloned from template via testcontainers)
- **Test caller**: `createTestCaller({ asAdmin: true })` for admin context
- **Location**: `src/__tests__/routers/*.test.ts`, `src/__tests__/services/*.test.ts`
- **Router tests** (32): authorization, bonusPoints, contract, dashboard, division, game, gameReport, leagueTransfer, news, organization, page, plan, player, publicGameReport, round, scheduler, season, security, settings, sponsor, standings, standings-extended, stats, subscription, team, teamDivision, teamTrikot, trikot, trikotTemplate, userPreferences, users, websiteConfig
- **Service tests** (3): ensureSystemPages, planLimits, scheduler
- **Utils**: `src/__tests__/testUtils.ts`, `src/__tests__/globalSetup.ts`, `src/__tests__/setup.ts`

## Auth Details

- Better Auth with **magic link** (email) + passkey (WebAuthn) + TOTP-based 2FA
- **No password-based login** — users authenticate via magic links sent to email
- Session duration: 7 days
- Cross-subdomain cookies: enabled via `COOKIE_DOMAIN` (defaults to `puckhub.localhost`)
- Trusted origins: `TRUSTED_ORIGINS` env var (comma-separated) or `http://admin.puckhub.localhost,http://platform.puckhub.localhost`
- Serialization: superjson transformer
- Demo users: magic link bypassed via `/api/demo-login` endpoint
