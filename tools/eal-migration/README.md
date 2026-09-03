# @puckhub/eal-migration

One-off importer that migrates a single legacy MariaDB league database (`eal_local`)
into PuckHub's PostgreSQL schema.

It lives here rather than in `packages/db` on purpose: it is not part of the runtime,
it is the only thing in the repository that needs `mysql2`, and the production image
copies `packages/` but not `tools/`, so keeping it out of the db package keeps that
driver out of the shipped image.

## Usage

```bash
pnpm --filter @puckhub/eal-migration migrate:eal:analyze  # read-only report
pnpm --filter @puckhub/eal-migration migrate:eal          # write to PostgreSQL
```

Reads `.env` from the monorepo root. Required variables:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Target PuckHub PostgreSQL database |
| `LEGACY_MYSQL_HOST` | Legacy MariaDB host |
| `LEGACY_MYSQL_PORT` | Legacy MariaDB port |
| `LEGACY_MYSQL_USER` | Legacy MariaDB user |
| `LEGACY_MYSQL_PASSWORD` | Legacy MariaDB password |
| `LEGACY_MYSQL_DATABASE` | Legacy MariaDB database name |
| `UPLOAD_DIR` | Destination for copied team images (defaults to `<repo>/uploads`) |
