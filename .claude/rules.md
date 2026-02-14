# PuckHub CMS — Coding Rules & Conventions

## 1. Code Formatting (Biome)

| Setting | Value |
|---------|-------|
| Indent | 2 spaces |
| Line width | 120 chars |
| Line endings | LF |
| Quotes (JS) | Single |
| Quotes (JSX) | Double |
| Semicolons | As needed (omit unnecessary) |
| Trailing commas | ES5 style |
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
- **DB columns**: snake_case in SQL schema, camelCase in TypeScript via Drizzle
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

- Three procedure levels: `publicProcedure`, `protectedProcedure`, `adminProcedure`
- Zod input validation on all mutations
- `superjson` transformer for Date/Map/Set serialization
- Errors via `createAppError()` with i18n error codes
- Router structure: one file per domain entity in `packages/api/src/trpc/routers/`

## 7. Database / Drizzle Patterns

- UUID primary keys with `defaultRandom()`
- Timestamps: `withTimezone: true`, `defaultNow()`
- Foreign keys: `cascade` for dependent records, `set null` for optional references
- **Self-joins**: Use `aliasedTable()` from `drizzle-orm/alias` — never `sql` template literals as join targets
- Relations defined in `packages/db/src/schema/relations.ts` (required for `with:` in relational queries)
- Schema files: one per table/enum in `packages/db/src/schema/`

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

- **Unit tests**: Vitest — `*.test.ts` / `*.spec.ts`
- **E2E tests**: Playwright — `apps/admin/tests/`
- **DB isolation**: Each test gets a fresh database created from a template
- **Test utils**: `packages/api/src/__tests__/testUtils.ts`
- Run all: `pnpm test` · Run E2E: `pnpm --filter @puckhub/admin test:e2e`
