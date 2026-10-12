# PollBooth: rebuild everything on a new server

Keep this file. It contains no secrets. You need three things that are NOT on GitHub:
1. The backup password (in your password manager).
2. A Cloudflare R2 access key for the `pollbooth-backups` bucket (create a new one if lost).
3. Access to your Cloudflare dashboard (to point the domain at the new server).

What lives where: code = GitHub. Database + .env files + nginx settings = encrypted nightly
backups in the private R2 bucket `pollbooth-backups`. Poll images = R2 bucket (public, untouched).

## 1. New server
Create an Ubuntu server (Oracle). Open ports 22, 80, 443. Log in, then:
    sudo apt-get update && sudo apt-get install -y git nginx certbot gpg rclone
    curl -fsSL https://get.docker.com | sudo sh && sudo usermod -aG docker $USER
Log out and back in so Docker works without sudo.

## 2. Get the code
    git clone https://github.com/examsathiAi/pollbooth.git ~/pollbooth
(If GitHub asks for a password, use a personal access token from GitHub settings.)

## 3. Connect to the backup bucket
In Cloudflare R2, create a new API token for `pollbooth-backups` (Object Read & Write).
Then run these one at a time, typing the two keys at the prompts:
    read -p "Access Key ID: " AK
    read -s -p "Secret Access Key: " SK; echo
    read -p "R2 endpoint (https://<account-id>.r2.cloudflarestorage.com): " EP
    mkdir -p ~/.config/rclone
    printf '[r2backup]\ntype = s3\nprovider = Cloudflare\naccess_key_id = %s\nsecret_access_key = %s\nendpoint = %s\nacl = private\nno_check_bucket = true\n' "$AK" "$SK" "$EP" > ~/.config/rclone/rclone.conf
    chmod 600 ~/.config/rclone/rclone.conf; unset AK SK
    rclone lsf r2backup:pollbooth-backups

## 4. Download the newest backups and unlock the settings
    mkdir -p ~/restore && cd ~/restore
    rclone copy r2backup:pollbooth-backups . --include "db-*.gpg" --include "config-*.gpg"
    ls -1 db-* config-*
Pick the newest db-... and config-... file names, then (it asks for the backup password):
    mkdir cfg && gpg --pinentry-mode loopback -d config-YYYYMMDD-HHMM.tar.gz.gpg | tar xzf - -C cfg
    cd ~/restore/cfg
    cp .env ~/pollbooth/.env && cp docker-compose.prod.yml ~/pollbooth/
    cp apps/api/.env ~/pollbooth/apps/api/.env
    cp apps/admin/.env.production ~/pollbooth/apps/admin/ && cp apps/web/.env.production ~/pollbooth/apps/web/
    cp packages/prisma/.env ~/pollbooth/packages/prisma/.env
    sudo cp etc/nginx/sites-enabled/pollbooth /etc/nginx/sites-available/pollbooth
    sudo cp etc/nginx/conf.d/upload_limit.conf /etc/nginx/conf.d/

## 5. Start the database and restore the data (BEFORE starting the apps)
    cd ~/pollbooth
    docker compose -f docker-compose.prod.yml up -d postgres redis
    sleep 20
    gpg --pinentry-mode loopback -d ~/restore/db-YYYYMMDD-HHMM.sql.gz.gpg | gunzip | docker compose -f docker-compose.prod.yml exec -T postgres psql -U pollbooth -d pollbooth_prod
Errors about "already exists" are harmless only on an empty first run; any other error: stop and investigate.

## 6. Start the apps
    docker compose -f docker-compose.prod.yml up -d --build
    docker compose -f docker-compose.prod.yml ps
All five services should say Up.

## 7. Point the domain and get the certificate
In Cloudflare DNS, change the A records for pollbooth.in (and any subdomains listed after
"server_name" in /etc/nginx/sites-available/pollbooth) to the NEW server's IP. Set them to
"DNS only" (grey cloud) until the certificate is issued, then back to "Proxied" (orange).
    sudo systemctl stop nginx
    sudo certbot certonly --standalone -d pollbooth.in -d www.pollbooth.in
    sudo ln -sf /etc/nginx/sites-available/pollbooth /etc/nginx/sites-enabled/pollbooth
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo nginx -t && sudo systemctl start nginx
Add every domain from server_name to the certbot command. Open https://pollbooth.in to check.

## 8. Bring back the nightly backups
    cp ~/pollbooth/scripts/pollbooth-backup.sh ~/ && chmod 700 ~/pollbooth-backup.sh
    read -s -p "Backup password: " P; echo; printf '%s' "$P" > ~/.backup_pass; chmod 600 ~/.backup_pass; unset P
    (crontab -l 2>/dev/null; echo "0 22 * * * $HOME/pollbooth-backup.sh >> $HOME/backups/backup.log 2>&1") | crontab -
    ~/pollbooth-backup.sh

Test this guide once in a calm moment on a spare small server. An untested backup is a hope.
