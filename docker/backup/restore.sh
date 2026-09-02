#!/bin/sh
# Restores a pg_dump custom-format file into the running postgres container.
#
# Runs inside the db-backup sidecar, which has pg_restore, the backup volume
# and network access to postgres:
#   docker compose -f docker-compose.prod.yml stop api
#   docker compose -f docker-compose.prod.yml run --rm db-backup /backup/restore.sh puckhub-20250901-030000.dump
#   docker compose -f docker-compose.prod.yml start api
#
# Usage: restore.sh [--yes] <dump-file-name | /absolute/path/to/file.dump>
#
# STOP THE API FIRST. The restore drops and recreates every table; open
# connections from the API would block the drops or see half-restored data.
set -u

log() {
  echo "[db-restore] $(date -u +%Y-%m-%dT%H:%M:%SZ) $*"
}

BACKUP_DIR="${BACKUP_DIR:-/backups}"
assume_yes=0
file=""
for arg in "$@"; do
  case "$arg" in
    --yes | -y) assume_yes=1 ;;
    -h | --help)
      sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) file="$arg" ;;
  esac
done

if [ -z "$file" ]; then
  echo "Usage: $0 [--yes] <dump-file>" >&2
  echo "Available dumps in $BACKUP_DIR:" >&2
  ls -1 "$BACKUP_DIR"/puckhub-*.dump 2>/dev/null >&2 || echo "  (none)" >&2
  exit 2
fi

case "$file" in
  /*) ;;
  *) file="$BACKUP_DIR/$file" ;;
esac

if [ ! -f "$file" ]; then
  log "FAILED: dump file not found: $file"
  exit 2
fi

export PGPASSWORD="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"
PGUSER="${POSTGRES_USER:-puckhub}"
PGDATABASE="${POSTGRES_DB:-puckhub}"
PGHOST="${PGHOST:-postgres}"

if [ "$assume_yes" -ne 1 ]; then
  echo ""
  echo "This will DROP and recreate all objects in database '$PGDATABASE' on '$PGHOST'"
  echo "and load: $file"
  echo "Make sure the API container is stopped first (docker compose stop api)."
  printf "Type 'restore' to continue: "
  read -r answer
  if [ "$answer" != "restore" ]; then
    log "Aborted"
    exit 1
  fi
fi

log "Restoring $file into $PGDATABASE@$PGHOST"
if pg_restore -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" --clean --if-exists --no-owner --no-privileges "$file"; then
  log "OK: restore finished"
else
  log "FAILED: pg_restore reported errors (see output above)"
  exit 1
fi
