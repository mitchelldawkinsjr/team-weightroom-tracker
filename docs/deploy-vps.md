# VPS deployment (mitch-cloud)

## URLs

| Route | Purpose |
|-------|---------|
| `https://weightroom.360web.cloud/` | Standalone subdomain (NPM → `weightroom-app:3000`) |
| `https://ghfb.360web.cloud/weightroom/` | In-app hub proxy (ghfb nginx → `weightroom-app:3000`) |

## One-time setup

```bash
# On VPS
sudo bash scripts/vps-bootstrap.sh
cd /opt/team-weightroom-tracker
cp .env.example .env
# Edit .env: JWT_SECRET, COACH_PIN, POSTGRES_PASSWORD
```

### NGINX Proxy Manager

1. **weightroom.360web.cloud** — Forward to `http://weightroom-app:3000` (container on `360ws-network`)
   - Add DNS **A record**: `weightroom.360web.cloud` → VPS IP (same as `ghfb.360web.cloud`)
   - Run `bash scripts/npm-add-weightroom.sh` on the VPS (or use NPM UI)
   - After DNS propagates, request Let's Encrypt cert in NPM for the proxy host
2. **ghfb.360web.cloud** — unchanged; ghfb nginx handles `/weightroom/` after ghfb deploy

### GitHub Actions runner

Register self-hosted runner with labels: `self-hosted`, `Linux`, `mitch-cloud`, `team-weightroom`.

## Deploy

Push to `main` triggers `.github/workflows/deploy-vps.yml`, or:

```bash
cd /opt/team-weightroom-tracker
git pull   # or rsync from CI
docker compose -f docker-compose.prod.yml up -d --build
curl -fsS http://127.0.0.1:3020/
```

## Seed team

1. Open app (either URL)
2. Coach setup: team code `GHFB` (or your code), coach PIN from `.env`
3. Import roster CSV from coach dashboard

## Backups

```bash
# Manual
bash scripts/backup-postgres.sh

# Cron example (daily 3am)
0 3 * * * /opt/team-weightroom-tracker/scripts/backup-postgres.sh
```
