# PuckHub CMS — Coding Rules & Conventions

## 1. Code Formatting (Biome)

| Setting | Value |
|---------|-------|
| Indent | 2 spaces |
| Line width | 120 chars |
| Line endings | LF |
| Quotes (JS) | Double |
| Quotes (JSX) | Double |
| Semicolons | As needed (omit unnecessary) |
| Trailing commas | All |
| Arrow parens | Always |
| Bracket spacing | `true` |
| Bracket same line | `false` |

## 2. TypeScript

- **Strict mode** enabled with `noUncheckedIndexedAccess`
- Target: ES2022, Module: ESNext, Resolution: bundler
- `isolatedModules: true`, `noEmit: true` (type-check only)
- `forceConsistentCasingInFileNames: true`
- Lib: ES2022, DOM, DOM.Iterable

## 3. Naming Conventions

### Files & Directories
- **camelCase** for all source files: `seasonIndicator.tsx`, `schedulerService.ts`
- **camelCase** for directories: `gameReport/`, `structureBuilder/`
- **Exceptions**: route files (`_authed.tsx`, `$gameId/`), config files (`biome.json`), `index.ts`

### Code
- **Variables / functions**: camelCase
- **Types / interfaces / enums**: PascalCase (no `I` prefix on interfaces)
- **React components**: PascalCase exports, camelCase file names
- **DB columns**: snake_case in SQL, camelCase in TypeScript — mapped with Prisma `@map`/`@@map`
- **CSS**: Tailwind utility classes, merged with `cn()`

## 4. Import Rules

- **No `.js` extensions** — extensionless paths everywhere
- **`import type`** for type-only imports (`useImportType: warn`, `useExportType: warn`)
- **Node built-ins**: Must use `node:` protocol (`useNodejsImportProtocol: error`)
- **Path aliases** (admin app only): `~/` = `src/`, `@/` = `lib/`
- **Package imports**: `@puckhub/ui`, `@puckhub/db`, `@puckhub/api`
- **Import organization**: Biome auto-organizes imports

## 5. React Patterns

- `forwardRef` + `displayName` on DOM-wrapping components
- CVA (`class-variance-authority`) for variant-based component styling
- `cn()` (clsx + tailwind-merge) for class merging
- State management: tRPC queries (server), `useState` (local), React Context (shared) — no global state library
- Hooks: `useTranslation()` for i18n, tRPC hooks for data fetching

## 6. tRPC / API Patterns

- Seven procedure levels, defined in `packages/api/src/trpc/init.ts`:
  - `publicProcedure` — no auth, read-only public data
  - `cachedPublicProcedure` — `publicProcedure` + in-process TTL cache per (path, input), scoped by organization; only for pure (org, season) reads
  - `protectedProcedure` — requires an authenticated session
  - `orgProcedure` — session + active org, loads member roles
  - `orgAdminProcedure` — owner/admin role within the org
  - `adminProcedure` — alias for `orgAdminProcedure`
  - `platformAdminProcedure` — platform-level `user.role === "admin"`
- Foreign ids accepted by a mutation must be checked with `assertOrgOwnership`/`assertOrgOwnershipMany` from `routers/_ownership.ts`
- Zod input validation on all mutations
- `superjson` transformer for Date/Map/Set serialization
- Errors via `createAppError()` with i18n error codes
- Router structure: one file per domain entity in `packages/api/src/trpc/routers/`, composed into `appRouter` in `packages/api/src/trpc/index.ts`

## 7. Database / Prisma Patterns

- Single schema file: `packages/db/prisma/schema.prisma` — enums, models and relations all live there
- Primary keys: `@default(uuid(7)) @db.Uuid` for time-sortable ids on application tables. The Better Auth tables (`User`, `Session`, `Account`, `Verification`, `Member`, `Invitation`, …) keep plain `String @id` because Better Auth generates those ids itself
- Timestamps: `@db.Timestamptz` with `@default(now())`
- Foreign keys: `onDelete: Cascade` for dependent records, `onDelete: SetNull` for optional references
- Naming: `@map`/`@@map` keep the database snake_case while TypeScript stays camelCase
- Relational reads use Prisma `include`/`select`; there is no separate relations file
- Most application tables are organization-scoped via `organizationId`
- **Every schema change needs a committed migration** — see [`packages/db/AGENT.md`](../packages/db/AGENT.md)

## 8. i18n Rules

- Primary locale: `de-DE` (German), secondary: `en-US` (English)
- Two namespaces: `common`, `errors`
- Always use `useTranslation()` hook — never hardcode UI strings
- Translation files: `apps/admin/src/i18n/locales/{locale}/{namespace}.json`

## 9. Key Linting Rules (Biome)

| Rule | Level | Note |
|------|-------|------|
| `noConsole` | off | Console logging allowed |
| `noExplicitAny` | off | `any` permitted (relaxed further in test files) |
| `useConst` | error | Prefer `const` over `let` |
| `useExportType` | warn | Use `export type` for type-only exports |
| `useImportType` | warn | Use `import type` for type-only imports |
| `useNodejsImportProtocol` | error | Must use `node:` prefix |
| `noNonNullAssertion` | warn | Prefer null checks over `!` |
| `useBlockStatements` | off | Single-line if/arrow bodies allowed |
| `noEmptyBlockStatements` | off | Empty blocks allowed |

### Test file overrides
- `noExplicitAny: off` in `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`

## 10. Testing

- **Unit tests**: Vitest — `packages/api/src/__tests__/routers/` and `__tests__/services/`
- **E2E tests**: Playwright — `apps/<app>/e2e/`, with the shared harness in `e2e/` at the repo root
- **DB isolation**: Each test gets a fresh database created from a template
- **Test utils**: `packages/api/src/__tests__/testUtils.ts`, `globalSetup.ts`, `setup.ts`
- Run unit tests: `pnpm test` (or `pnpm test:api`)
- Run E2E: `pnpm test:e2e` (admin) · `pnpm test:e2e:all` (every app). Each app's own script is `test`, e.g. `pnpm --filter @puckhub/admin test`
