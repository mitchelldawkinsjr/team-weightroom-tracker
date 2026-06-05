#!/usr/bin/env bash
# One-time host prep for docker-compose.prod.yml (run on the VPS).
set -euo pipefail

NET="${DOCKER_NETWORK:-360ws-network}"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/team-weightroom-tracker}"

if ! docker network inspect "$NET" >/dev/null 2>&1; then
  echo "Creating Docker network: $NET"
  docker network create "$NET"
else
  echo "Docker network exists: $NET"
fi

mkdir -p "$DEPLOY_DIR"
echo "Deploy directory ready: $DEPLOY_DIR"
echo ""
echo "Next steps:"
echo "  1. Copy .env to $DEPLOY_DIR/.env (JWT_SECRET, COACH_PIN, POSTGRES_PASSWORD)"
echo "  2. Push to main or rsync + docker compose -f docker-compose.prod.yml up -d"
echo "  3. NPM: weightroom.360web.cloud -> http://weightroom-app:3000"
echo "  4. ghfb nginx proxies /weightroom/ to weightroom-app (after ghfb deploy)"
