# @puckhub/api

Hono HTTP server with tRPC routers and Better Auth. Runs on port 3001.

## Architecture

```
src/
├── index.ts           # Entry point — loads env, auto-migrates, starts server
├── app.ts             # Hono app — CORS, auth routes, tRPC mount, uploads, health
├── lib/auth.ts        # Better Auth config (email/password, 7-day sessions)
├── routes/
│   └── upload.ts      # File upload handler (POST /api/upload)
├── services/
│   ├── standingsService.ts    # Standings calculation logic
│   ├── schedulerService.ts    # Game scheduling logic
│   └── statsService.ts        # Statistics aggregation
└── trpc/
    ├── init.ts        # tRPC init, middleware, procedure types
    ├── context.ts     # Request context (db, session, user)
    ├── index.ts       # Root router composition (appRouter)
    └── routers/       # 22 feature routers
```

## HTTP Routes

| Method | Path | Handler |
|--------|------|---------|
| `*` | `/api/auth/**` | Better Auth (login, signup, session) |
| `*` | `/api/trpc/*` | tRPC handler |
| `POST` | `/api/upload` | File upload (logo/photo, max 5MB, images only) |
| `GET` | `/api/uploads/*` | Static file serving |
| `GET` | `/api/health` | Health check |

## Routers (22)

`season` · `division` · `round` · `team` · `teamDivision` · `player` · `contract` · `game` · `gameReport` · `standings` · `stats` · `trikotTemplate` · `trikot` · `teamTrikot` · `users` · `setup` · `settings` · `sponsor` · `news` · `page` · `venue` · `userPreferences`

## Procedure Types

```ts
publicProcedure      // No auth — use for read-only public data
protectedProcedure   // Requires authenticated session (isAuthed middleware)
adminProcedure       // Requires super_admin or league_admin role (isAdmin middleware)
```

Most mutations use `adminProcedure`. Public queries for standings/stats use `publicProcedure`.

## Services

| Service | Purpose |
|---------|---------|
| `standingsService.ts` | Calculate standings from game results, bonus points |
| `schedulerService.ts` | Generate round-robin game schedules |
| `statsService.ts` | Aggregate player/goalie statistics |

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
import { schema } from '@puckhub/db'
import { eq } from 'drizzle-orm'

export const myRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.query.myTable.findMany()
  }),
  create: adminProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.insert(schema.myTable).values(input).returning()
    }),
})
```

## Testing

- **Framework**: Vitest
- **Per-test DB isolation**: Each test gets a fresh PostgreSQL database (created from template)
- **Test caller**: `createTestCaller({ asAdmin: true })` for admin context
- **Location**: `src/__tests__/routers/*.test.ts`
- **Env vars**: `TEST_DB_BASE_URL`, `TEST_DB_TEMPLATE`

## Auth Details

- Better Auth with email/password
- Session duration: 7 days
- Trusted origins: `TRUSTED_ORIGINS` env var (comma-separated) or `http://localhost:3000`
- Serialization: superjson transformer
