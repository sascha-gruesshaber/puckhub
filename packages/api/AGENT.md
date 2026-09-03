# @puckhub/api

Hono HTTP server with tRPC routers, Better Auth (magic link + passkey + 2FA), AI services (recaps, SEO, home widgets), and email infrastructure. Runs on port 3001.

## Architecture

```
src/
├── index.ts           # Entry point — loads env, auto-migrates, starts server
├── app.ts             # Hono app — CORS, auth routes, tRPC mount, uploads, health
├── lib/
│   ├── auth.ts        # Better Auth config (magic link, passkey, 2FA, 7-day sessions)
│   ├── ensureDefaultUser.ts  # Creates default admin on first startup (magic link, no password)
│   ├── email.ts       # SMTP via nodemailer (falls back to console if unconfigured)
│   ├── emailTemplates.ts  # HTML email templates (magic link, invite, OTP, report reverted, contact OTP, contact notification)
│   ├── otp.ts         # CSPRNG one-time codes, rate-limit markers, failed-attempt lockout (verification table)
│   ├── publicCache.ts # TTL cache for publicSite reads (+ ttlCache.ts factory); disabled under Vitest
│   ├── s3.ts          # S3-compatible client for API-driven backups (S3_* env)
│   ├── sanitizeHtml.ts # HTML sanitization for user-supplied rich text
│   ├── validation.ts  # Shared Zod refinements / input validators + string length bounds
│   └── jobs/
│       ├── aiHomeWidgetsJob.ts   # Daily cron for AI home widget generation (AI_WIDGETS_CRON)
│       ├── backupJob.ts          # Daily cron for API-driven backups (BACKUP_CRON)
│       ├── demoResetJob.ts       # Periodic demo data reset (DEMO_RESET_CRON)
│       ├── newsAutoPublishJob.ts # Promotes scheduled news every minute (NEWS_AUTO_PUBLISH_CRON)
│       └── statsRecalcJob.ts     # Nightly standings/stats recalculation (STATS_RECALC_CRON)
├── errors/
│   ├── appError.ts    # createAppError, inferAppErrorCode functions
│   └── codes.ts       # APP_ERROR_CODES enum (80 error codes)
├── routes/
│   ├── stripe-webhook.ts # Stripe webhook handler (POST /api/webhooks/stripe) — verifies the
│   │                     # Stripe signature before any handler runs; 503 without STRIPE_WEBHOOK_SECRET
│   └── upload.ts      # File upload handler (POST /api/upload) — the stored type comes from the
│                      # file's magic bytes, never from the client-declared MIME type
├── services/
│   ├── aiRecapService.ts          # AI game recap generation (OpenRouter + Gemini)
│   ├── contractHistory.ts          # Season-scoped positions, contract continuations, historic team names
│   ├── aiSeoService.ts             # AI SEO text generation for news/pages (OpenRouter + Gemini)
│   ├── aiSeasonDescriptionService.ts  # AI season SEO description generation
│   ├── aiHomeWidgetService.ts      # AI home page widgets (league pulse digest, headlines ticker)
│   ├── backupService.ts           # Org backup create/restore/download
│   ├── ensureSystemPages.ts       # Auto-provision system pages for organizations
│   ├── planLimits.ts              # Plan limit checking and enforcement
│   ├── schedulerService.ts        # Round-robin game scheduling logic
│   ├── teamMerge.ts               # Merge two teams, preserving contracts and name history
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
    └── routers/       # 33 feature routers
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
| `GET` | `/api/health` | Health check (runs `SELECT 1`; 503 when the database is unreachable) |

## Routers (33)

`aiRecap` · `backup` · `bonusPoints` · `contactForm` · `contract` · `dashboard` · `division` · `game` · `gameReport` · `leagueTransfer` · `news` · `organization` · `page` · `plan` · `player` · `publicGameReport` · `publicSite` · `round` · `scheduler` · `season` · `settings` · `sponsor` · `standings` · `stats` · `subscription` · `team` · `teamDivision` · `teamTrikot` · `trikot` · `trikotTemplate` · `userPreferences` · `users` · `websiteConfig`

`routers/_helpers.ts` and `routers/_ownership.ts` are shared helpers, not routers.

## Procedure Types

```ts
publicProcedure        // No auth — use for read-only public data
protectedProcedure     // Requires authenticated session (isAuthed middleware)
orgProcedure           // Requires session + active org + loads member roles (withOrgRoles middleware)
orgAdminProcedure      // Requires session + owner/admin role in org (isOrgAdmin middleware)
adminProcedure         // Alias for orgAdminProcedure (migration convenience)
platformAdminProcedure // Requires user.role === 'admin' at platform level (isPlatformAdmin middleware)
cachedPublicProcedure  // publicProcedure + in-process TTL cache per (path, input), scoped by organization; use only for pure (org, season) reads
```

Every org-scoped mutation (`orgProcedure`/`orgAdminProcedure`) invalidates that organization's public-site cache on success. Any foreign id a mutation accepts (round, division, season, team, player, trikot, page) must be checked with `assertOrgOwnership`/`assertOrgOwnershipMany` from `routers/_ownership.ts`; foreign ids are reported as NOT_FOUND.

Most mutations use `adminProcedure` (org-scoped). Public queries for standings/stats use `publicProcedure`. `orgProcedure` provides role context (`orgRole`, `memberRoles`, `hasRole()`) without requiring admin.

## Dependencies

Prisma is reached only through `@puckhub/db`, which owns the generated client. This package
has no direct `@prisma/client` dependency — importing it here would risk a version skew
against the client `packages/db` generates.

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
| AI Recap | `services/aiRecapService.ts` | Generate game recaps via OpenRouter (Gemini). 4-layer eligibility guard (not demo, aiEnabled, plan feature, token budget). Granular `aiGameRecaps` org toggle. Monthly token tracking per org. Fire-and-forget async generation with optimistic locking. |
| AI SEO | `services/aiSeoService.ts` | Generate SEO titles/descriptions for news and pages via OpenRouter (Gemini). Respects granular org toggles (`aiNewsSeo`, `aiPageSeo`). Fire-and-forget on create/update. |
| AI Season SEO | `services/aiSeasonDescriptionService.ts` | Generate season meta descriptions based on structure (divisions, teams, rounds). |
| AI Home Widgets | `services/aiHomeWidgetService.ts` | Generate daily home page content: "League Pulse Digest" (markdown) and "Headlines Ticker" (JSON). Staleness detection via data hash. Orchestrated by daily cron job. |
| Cron jobs | `lib/jobs/` | `aiHomeWidgetsJob` (05:30, `AI_WIDGETS_CRON`), `statsRecalcJob` (03:00, `STATS_RECALC_CRON`), `backupJob` (02:00, `BACKUP_CRON`), `newsAutoPublishJob` (every minute, `NEWS_AUTO_PUBLISH_CRON`), `demoResetJob` (`DEMO_RESET_CRON`). Registered in `src/index.ts`. |
| System Pages | `services/ensureSystemPages.ts` | Auto-provision required league site pages (home, standings, schedule, structure, etc.) on org creation. Locale-aware (DE/EN). Idempotent. |
| Contract History | `services/contractHistory.ts` | Season-scoped position lookup (a player's position lives on the contract covering that season), contract continuation sets, and the name a team carried in a given season. |
| Plan Limits | `services/planLimits.ts` | Check and enforce plan limits (maxTeams, maxPlayers, maxAdmins, etc.) |
| Backups | `services/backupService.ts` | Per-org backup create/restore/download, offloaded to S3 when `S3_*` is configured. Driven by `lib/jobs/backupJob.ts` (`BACKUP_CRON`, default 02:00). |
| Team Merge | `services/teamMerge.ts` | Merge two teams, moving contracts and recording the absorbed team's former names in `TeamNameHistory`. |
| Email | `lib/email.ts` | SMTP via nodemailer. Falls back to console logging in dev when SMTP unconfigured. |
| Public Report Privacy | `lib/publicReportPrivacy.ts` | Email/IP hashing and masking for GDPR compliance. Pure functions: normalize, mask, hash email/IP. |
| Scheduler | `lib/scheduler.ts` | Cron-based job scheduling and management. |
| Email Templates | `lib/emailTemplates.ts` | HTML templates: magic link sign-in, user invitation, OTP verification, report reverted notification, contact OTP, contact notification. Modern responsive design with reusable component functions, MSO compatibility. |

## Testing

- **Framework**: Vitest
- **Per-test DB isolation**: Each test gets a fresh PostgreSQL database (cloned from template via testcontainers)
- **Test caller**: `createTestCaller({ asAdmin: true })` for admin context
- **Location**: `src/__tests__/routers/*.test.ts`, `src/__tests__/services/*.test.ts`
- **Router tests** (37): authorization, bonusPoints, contract, contractSplit, crossOrgWrites, dashboard, division, game, gameReport, leagueTransfer, leagueTransferRoundTrip, news, organization, orgIsolation, page, plan, player, publicGameReport, round, scheduler, season, security, settings, sponsor, standings, standings-extended, stats, subscription, team, teamDivision, teamMerge, teamTrikot, trikot, trikotTemplate, userPreferences, users, websiteConfig
- **Service tests** (6): ensureSystemPages, planLimits, sanitizeHtml, scheduler, uploadAccess, validation
- **Lib tests** (1): email
- **Utils**: `src/__tests__/testUtils.ts`, `src/__tests__/globalSetup.ts`, `src/__tests__/setup.ts`
- **DB driver in tests**: `pg` (`pg.Pool`) for the maintenance/template connections — the API package does not depend on the `postgres` (porsager) client

## Auth Details

- Better Auth with **magic link** (email) + passkey (WebAuthn) + TOTP-based 2FA
- **No password-based login** — users authenticate via magic links sent to email
- Session duration: 7 days
- Cross-subdomain cookies: enabled via `COOKIE_DOMAIN` (defaults to `puckhub.localhost`)
- Trusted origins: `TRUSTED_ORIGINS` env var (comma-separated) or `http://admin.puckhub.localhost,http://platform.puckhub.localhost`
- Serialization: superjson transformer
- Demo users: magic link bypassed via `/api/demo-login` endpoint
