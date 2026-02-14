# @puckhub/config

Minimal package — currently empty. League configuration has been migrated to the database.

## Current State

The `src/index.ts` file is intentionally empty. All runtime configuration (league name, locale, timezone, point rules) is stored in the `system_settings` table in `@puckhub/db` and managed via the admin UI at `/settings`.

## Related

- **DB schema**: `packages/db/src/schema/system-settings.ts` — singleton table with `id=1` constraint
- **API router**: `packages/api/src/trpc/routers/settings.ts` — `get` (public) / `update` (admin)
- **Admin UI**: `apps/admin/src/routes/_authed/settings.tsx` — settings form
