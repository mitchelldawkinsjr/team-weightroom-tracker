# Team Weightroom Tracker

React + Node.js app for athletes and coaches to log weightroom sessions, track progress, and complete pre-session check-ins. Data synced via a shared team code.

## Quick start (Docker)

```bash
cp .env.example .env
# Edit .env — set JWT_SECRET at minimum
docker compose up --build -d
```

App → **http://localhost:3020** | Postgres stays internal (no host port exposed).

## VPS Deployment (NGINX Proxy Manager)

1. **Clone on VPS**
   ```bash
   git clone https://github.com/<you>/team-weightroom-tracker.git ~/team-weightroom-tracker
   cd ~/team-weightroom-tracker
   ```

2. **Create .env**
   ```bash
   cp .env.example .env
   # Set JWT_SECRET (required), POSTGRES_PASSWORD (recommended), PORT (default 3020)
   echo "JWT_SECRET=$(openssl rand -hex 32)" >> .env
   ```

3. **Build & start**
   ```bash
   docker compose up --build -d
   ```

4. **NGINX Proxy Manager**
   - Add a new Proxy Host pointing to `http://<vps-ip>:3020` (or `http://127.0.0.1:3020`)
   - Enable SSL via Let's Encrypt

5. **Updating**
   ```bash
   git pull
   docker compose up --build -d
   ```

## Development (local, no Docker)

```bash
npm install
npm run dev        # Vite dev server at http://localhost:5173 (no API)
# or with API:
# Start postgres separately, set DATABASE_URL, then:
node server/server.js &
VITE_API_BASE=http://localhost:3000 npm run dev
```

## Configuration

| Variable | Where | Description |
|---|---|---|
| `JWT_SECRET` | `.env` | **Required.** Secret for signing JWTs. |
| `POSTGRES_PASSWORD` | `.env` | Postgres password (default: `postgres`). |
| `PORT` | `.env` | Host port for the app (default: `3020`). |
| `VITE_COACH_PIN` | build arg | Override coach PIN at build time. |

## Scripts

```bash
npm run build          # Production Vite build
npm run test           # Playwright E2E tests
npm run test:server    # Backend integration tests (requires DATABASE_URL)
```
