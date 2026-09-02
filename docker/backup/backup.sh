#!/bin/sh
# Takes a compressed pg_dump of the production database and prunes old dumps.
#
# Runs inside the db-backup sidecar (postgres:16-alpine), either on schedule via
# crond or manually:
#   docker compose -f docker-compose.prod.yml run --rm db-backup /backup/backup.sh
#
# Env (all provided by docker-compose.prod.yml):
#   POSTGRES_PASSWORD      required
#   POSTGRES_USER          default puckhub
#   POSTGRES_DB            default puckhub
#   PGHOST                 default postgres
#   BACKUP_DIR             default /backups
#   BACKUP_RETENTION_DAYS  default 14 — dumps older than this are deleted
#   BACKUP_S3_BUCKET       optional — if set AND the aws CLI is present, the
#                          dump is also uploaded to s3://$BACKUP_S3_BUCKET/$BACKUP_S3_PREFIX
set -u

log() {
  echo "[db-backup] $(date -u +%Y-%m-%dT%H:%M:%SZ) $*"
}

export PGPASSWORD="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"
PGUSER="${POSTGRES_USER:-puckhub}"
PGDATABASE="${POSTGRES_DB:-puckhub}"
PGHOST="${PGHOST:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

case "$RETENTION_DAYS" in
  '' | *[!0-9]*)
    log "FAILED: BACKUP_RETENTION_DAYS must be a whole number, got '$RETENTION_DAYS'"
    exit 1
    ;;
esac

mkdir -p "$BACKUP_DIR"

timestamp="$(date -u +%Y%m%d-%H%M%S)"
dump="$BACKUP_DIR/puckhub-$timestamp.dump"
partial="$dump.part"

log "Starting dump of $PGDATABASE@$PGHOST -> $dump"

# Custom format (-Fc) is compressed and lets pg_restore pick single tables.
if pg_dump -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -Fc -Z 6 -f "$partial"; then
  mv "$partial" "$dump"
  size="$(du -h "$dump" | cut -f1)"
  log "OK: wrote $dump ($size)"
else
  rm -f "$partial"
  log "FAILED: pg_dump of $PGDATABASE@$PGHOST exited with an error, no dump written"
  exit 1
fi

# Prune dumps older than the retention window (and any stale partial files).
pruned="$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'puckhub-*.dump' -mmin "+$((RETENTION_DAYS * 24 * 60))" -print -delete | wc -l | tr -d ' ')"
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'puckhub-*.dump.part' -mmin +120 -delete
kept="$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'puckhub-*.dump' | wc -l | tr -d ' ')"
log "Retention: kept $kept dump(s), removed $pruned older than $RETENTION_DAYS day(s)"

# Optional offsite copy. postgres:16-alpine ships no aws CLI, so this only
# runs when the image was extended with one (see docs/runbooks/database-backup-restore.md).
if [ -n "${BACKUP_S3_BUCKET:-}" ]; then
  if command -v aws >/dev/null 2>&1; then
    target="s3://$BACKUP_S3_BUCKET/${BACKUP_S3_PREFIX:-postgres}/$(basename "$dump")"
    if aws s3 cp "$dump" "$target" --only-show-errors; then
      log "OK: uploaded to $target"
    else
      log "FAILED: upload to $target (local dump is intact)"
      exit 1
    fi
  else
    log "S3 offload skipped: BACKUP_S3_BUCKET is set but no 'aws' CLI in this image"
  fi
fi
