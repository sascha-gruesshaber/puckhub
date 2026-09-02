# Runbook: Database backup and restore

Applies to the production stack in `docker-compose.prod.yml`. All commands run on the host, in the directory that holds the compose file and `.env`.

## How backups run

- The `db-backup` sidecar (`postgres:16-alpine`, same network as `postgres`) runs `docker/backup/backup.sh` via busybox `crond`.
- Schedule: `BACKUP_SCHEDULE` (cron, default `0 3 * * *` = daily 03:00 container time, UTC).
- Each run writes `pg_dump -Fc -Z 6` of `$POSTGRES_DB` to the named volume `postgres_backups`, mounted at `/backups`, as `puckhub-YYYYMMDD-HHMMSS.dump`, then deletes dumps older than `BACKUP_RETENTION_DAYS` (default 14).
- Every run logs one `[db-backup] ... OK:` or `[db-backup] ... FAILED:` line. A failed dump leaves no file behind (it is written to `.part` first).
- Optional offsite copy: if `BACKUP_S3_BUCKET` is set **and** the container has an `aws` CLI, each dump is uploaded to `s3://$BACKUP_S3_BUCKET/$BACKUP_S3_PREFIX/`. The stock `postgres:16-alpine` image has no `aws` CLI, so by default this step is skipped with a log line. To enable it, build a derived image (`FROM postgres:16-alpine` + `RUN apk add --no-cache aws-cli`), point the `db-backup` service at it and set `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION` (and `AWS_ENDPOINT_URL` for non-AWS S3).

Nothing else backs up the database. The per-organisation export in the admin UI (`Backup` / `leagueTransfer`, stored in `S3_BACKUP_BUCKET`) is an application-level JSON export of one league; it does not cover users, sessions, plans, subscriptions, system settings or the `_prisma_migrations` table, and it is not a substitute for these dumps.

Uploaded files live in the `uploads` volume and are **not** part of the database dump. Back that volume up separately.

## Where backups live and how to list them

```bash
docker compose -f docker-compose.prod.yml logs --tail 20 db-backup
docker compose -f docker-compose.prod.yml run --rm db-backup ls -lh /backups
```

Copy a dump to the host (e.g. before a risky migration, or to move it offsite by hand):

```bash
docker compose -f docker-compose.prod.yml run --rm db-backup cat /backups/puckhub-20250901-030000.dump > puckhub-20250901-030000.dump
```

Take an immediate dump outside the schedule:

```bash
docker compose -f docker-compose.prod.yml run --rm db-backup /backup/backup.sh
```

## How to restore

1. Stop the API so nothing writes to the database and no open connection blocks the restore. The frontends keep running but will show errors until step 4.

   ```bash
   docker compose -f docker-compose.prod.yml stop api
   ```

2. Pick the dump (see listing above) and, if in doubt, take a fresh dump of the current state first:

   ```bash
   docker compose -f docker-compose.prod.yml run --rm db-backup /backup/backup.sh
   ```

3. Restore. The script asks for confirmation (type `restore`); pass `--yes` to skip the prompt. It runs `pg_restore --clean --if-exists --no-owner --no-privileges -d $POSTGRES_DB`, so every table is dropped and recreated from the dump.

   ```bash
   docker compose -f docker-compose.prod.yml run --rm db-backup /backup/restore.sh puckhub-20250901-030000.dump
   ```

   To restore a dump that is on the host rather than in the volume, mount it in:

   ```bash
   docker compose -f docker-compose.prod.yml run --rm -v "$PWD/puckhub-20250901-030000.dump:/tmp/restore.dump:ro" db-backup /backup/restore.sh /tmp/restore.dump
   ```

4. Start the API again. With `AUTO_MIGRATE=true` (default) it applies any migrations that are newer than the dump.

   ```bash
   docker compose -f docker-compose.prod.yml start api
   ```

## How to verify a restore

```bash
# API is up and can reach the database (expects {"status":"ok","db":"ok",...})
curl -fsS https://api.<your-domain>/api/health

# Migrations are all applied (expects "No pending migrations")
docker compose -f docker-compose.prod.yml exec api sh -c 'cd packages/db && npx prisma migrate status'

# Row counts look right
docker compose -f docker-compose.prod.yml exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "SELECT (SELECT count(*) FROM organizations) AS organizations, (SELECT count(*) FROM games) AS games, (SELECT count(*) FROM \"user\") AS users;"
```

Then log in to the admin UI and open a league that existed at the time of the dump.

## Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `BACKUP_SCHEDULE` | `0 3 * * *` | Cron schedule for `pg_dump` |
| `BACKUP_RETENTION_DAYS` | `14` | Delete dumps older than this |
| `BACKUP_S3_BUCKET` | — | Optional S3 bucket for offsite copies (needs `aws` CLI in the image) |
| `BACKUP_S3_PREFIX` | `postgres` | Key prefix inside the bucket |

Changing any of these requires `docker compose -f docker-compose.prod.yml up -d db-backup` to recreate the sidecar.
