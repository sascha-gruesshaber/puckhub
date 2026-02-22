# @puckhub/api

Hono HTTP server with tRPC routers and Better Auth. Runs on port 3001.

## Architecture

```
src/
├── index.ts           # Entry point — loads env, auto-migrates, starts server
├── app.ts             # Hono app — CORS, auth routes, tRPC mount, uploads, health
├── lib/auth.ts        # Better Auth config (email/password, passkey, 2FA, 7-day sessions)
├── errors/
│   ├── appError.ts    # createAppError, inferAppErrorCode functions
│   └── codes.ts       # APP_ERROR_CODES enum (20 error codes)
├── routes/
│   └── upload.ts      # File upload handler (POST /api/upload)
├── services/
│   └── schedulerService.ts  # Round-robin game scheduling logic
└── trpc/
    ├── init.ts        # tRPC init, middleware, procedure types
    ├── context.ts     # Request context (db, session, user)
    ├── client.ts      # AppRouter type export
    ├── index.ts       # Root router composition (appRouter)
    └── routers/       # 25 feature routers
```

## HTTP Routes

| Method | Path | Handler |
|--------|------|---------|
| `*` | `/api/auth/**` | Better Auth (login, signup, session, passkey, 2FA) |
| `*` | `/api/trpc/*` | tRPC handler |
| `POST` | `/api/upload` | File upload (logo/photo, max 5MB, images only) |
| `GET` | `/api/uploads/*` | Static file serving |
| `GET` | `/api/health` | Health check |

## Routers (25)

`season` · `division` · `round` · `team` · `teamDivision` · `player` · `contract` · `game` · `gameReport` · `standings` · `stats` · `trikotTemplate` · `trikot` · `teamTrikot` · `users` · `setup` · `settings` · `sponsor` · `news` · `page` · `venue` · `userPreferences` · `bonusPoints` · `dashboard` · `organization`

## Procedure Types

```ts
publicProcedure        // No auth — use for read-only public data
protectedProcedure     // Requires authenticated session (isAuthed middleware)
adminProcedure         // Requires org admin role (alias for orgAdminProcedure)
orgAdminProcedure      // Requires Better Auth organization admin/owner role
platformAdminProcedure // Requires platform-level admin privileges
```

Most mutations use `adminProcedure` (org-scoped). Public queries for standings/stats use `publicProcedure`.

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

## Testing

- **Framework**: Vitest
- **Per-test DB isolation**: Each test gets a fresh PostgreSQL database (cloned from template via testcontainers)
- **Test caller**: `createTestCaller({ asAdmin: true })` for admin context
- **Location**: `src/__tests__/routers/*.test.ts` (26 test files), `src/__tests__/services/*.test.ts` (1 test file)
- **Utils**: `src/__tests__/testUtils.ts`, `src/__tests__/globalSetup.ts`, `src/__tests__/setup.ts`

## Auth Details

- Better Auth with email/password + passkey + TOTP-based 2FA
- Session duration: 7 days
- Trusted origins: `TRUSTED_ORIGINS` env var (comma-separated) or `http://localhost:3000`
- Serialization: superjson transformer
