#!/usr/bin/env bash
# Dump Postgres from the production compose stack. Run on VPS via cron.
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/team-weightroom-tracker/backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$BACKUP_DIR/weightroom-$STAMP.sql.gz"

mkdir -p "$BACKUP_DIR"
docker exec weightroom-postgres pg_dump -U postgres weightroom | gzip > "$FILE"
echo "Wrote $FILE"

# Keep last 14 daily-ish backups
ls -1t "$BACKUP_DIR"/weightroom-*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm --
