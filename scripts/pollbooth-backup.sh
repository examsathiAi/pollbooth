#!/bin/bash
# PollBooth nightly backup: database + settings, locked with a password, kept 14 days.
# If rclone is set up with a remote named "r2backup", copies are also sent off this server.
set -uo pipefail
cd "$HOME/pollbooth" || exit 1
DIR="$HOME/backups"; PASS="$HOME/.backup_pass"; STAMP=$(date +%Y%m%d-%H%M)
mkdir -p "$DIR"
[ -s "$PASS" ] || { echo "$(date) ERROR: password file missing"; exit 1; }

DB="$DIR/db-$STAMP.sql.gz"
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U pollbooth -d pollbooth_prod --no-owner | gzip > "$DB"
if ! gzip -t "$DB" || [ "$(stat -c %s "$DB")" -lt 20000 ]; then
  echo "$(date) ERROR: database backup looks wrong, keeping nothing"; rm -f "$DB"; exit 1
fi

CFG="$DIR/config-$STAMP.tar.gz"
tar czhf "$CFG" .env apps/api/.env apps/admin/.env.production apps/web/.env.production packages/prisma/.env docker-compose.prod.yml /etc/nginx/sites-enabled/pollbooth /etc/nginx/conf.d/upload_limit.conf 2>/dev/null

for f in "$DB" "$CFG"; do
  gpg --batch --yes --pinentry-mode loopback --passphrase-file "$PASS" --cipher-algo AES256 -c "$f" && rm -f "$f"
done

if command -v rclone >/dev/null 2>&1 && rclone listremotes | grep -q '^r2backup:'; then
  rclone copy "$DB.gpg" r2backup:pollbooth-backups/ && rclone copy "$CFG.gpg" r2backup:pollbooth-backups/ \
    && echo "$(date) uploaded off-server" || echo "$(date) WARNING: off-server upload failed"
fi

find "$DIR" -name '*.gpg' -mtime +14 -delete
echo "$(date) OK $(ls -1 "$DIR" | wc -l) files, latest db: $(du -h "$DB.gpg" | cut -f1)"
