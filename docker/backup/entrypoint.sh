#!/bin/sh
# Entrypoint for the db-backup sidecar (docker-compose.prod.yml).
#
# Without arguments: installs a crontab from BACKUP_SCHEDULE and runs busybox
# crond in the foreground, so dumps are taken on schedule.
# With arguments: runs them instead (e.g. `/backup/backup.sh` for a one-off
# dump, or `/backup/restore.sh <file>` for a restore).
set -eu

if [ "$#" -gt 0 ]; then
  exec "$@"
fi

SCHEDULE="${BACKUP_SCHEDULE:-0 3 * * *}"

# Busybox crond inherits this process's environment (POSTGRES_*, BACKUP_*),
# so the job needs no extra wiring. Output goes to the container log via PID 1.
mkdir -p /etc/crontabs
echo "$SCHEDULE /backup/backup.sh >/proc/1/fd/1 2>/proc/1/fd/2" > /etc/crontabs/root

echo "[db-backup] Scheduled: '$SCHEDULE' (retention ${BACKUP_RETENTION_DAYS:-14} days, dir ${BACKUP_DIR:-/backups})"
exec crond -f -l 6
