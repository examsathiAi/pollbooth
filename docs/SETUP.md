# PollBooth — Setup Guide

For a new developer, or a new AI coding agent, picking this project up cold.

## Prerequisites

- Node.js (LTS)
- pnpm (`npm install -g pnpm` if not already installed)
- Docker Desktop (for local Postgres/Redis) — or access to an already-running Postgres 15+
  and Redis instance
- Git

## 1. Clone / open the repo

```
cd pollbooth-final/pollbooth
```

## 2. Install dependencies

```
pnpm install
```

## 3. Start the database and Redis

If using this project's `docker-compose.yml`:
```
docker compose up -d postgres redis
```

**Before doing this**, check `docker ps -a` first — if a Postgres or Redis container is
already running on your machine from earlier work on this same project (or from an
unrelated project), you may hit a port conflict. Confirm which instance is the real,
current one for this project before creating a new one. See `PROJECT_STATE.md` → "Known
issues" for the specific history of this happening during initial development.

## 4. Environment variables

Create these two files (they are not committed to git — check `.gitignore`):

**`packages/prisma/.env`**
```
DATABASE_URL="postgresql://<user>:<password>@localhost:<port>/<database>"
```

**`apps/api/.env`**
```
DATABASE_URL="postgresql://<user>:<password>@localhost:<port>/<database>"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="<a long random string, minimum 32 characters>"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_EXPIRES_IN="30d"
NODE_ENV="development"
PORT="3001"
```

Match the credentials to whatever your actual running Postgres container/instance uses —
check `docker-compose.yml` in the repo root for the intended defaults, but confirm against
what's actually running via `docker ps` if anything seems inconsistent.

The full list of environment variables the API references (including optional
third-party integrations not required for local dev — Firebase, Razorpay, AWS, Twilio,
AdMob) is in `.env.example` at the repo root and inside `docker-compose.yml`'s `api`
service definition.

## 5. Run database migrations

```
cd packages/prisma
npx prisma migrate dev
```

This applies all existing migrations and generates the Prisma Client. If this is a
genuinely fresh database, it will also run the seed script automatically.

## 6. Start everything

From the repo root:
```
pnpm dev
```

This runs `turbo run dev`, which starts `apps/api`, `apps/web`, and `apps/admin` together.

## 7. Verify it's actually working

Don't assume it's fine just because the terminal shows no red text — check these directly:

- **API health check**: open `http://localhost:3001/health` in a browser. Expected response: `{"status":"ok","timestamp":"..."}`
- **Web app**: open `http://localhost:3000` — should render the full landing page.
- **Admin app**: open `http://localhost:3002` — should render the admin dashboard shell.

If any of these don't respond, check the terminal output for the specific app
(`@pollbooth/api:dev:`, `@pollbooth/web:dev:`, `@pollbooth/admin:dev:` prefixes distinguish them in
the combined Turbo output) rather than assuming the whole thing is broken — it's common
for one app to fail while the others succeed.

## Common issues encountered during development (and their fixes)

| Symptom | Cause | Fix |
|---|---|---|
| `EADDRINUSE` on port 3000/3001/3002 | An old `pnpm dev` process is still running in the background (e.g., a terminal that appeared "stuck") | Find and kill it: `netstat -ano \| findstr "3000 3001 3002"` (Windows), then `taskkill /PID <pid> /F` for each PID found |
| `P1000: Authentication failed against database server` | `DATABASE_URL` doesn't match the actual running Postgres instance's real credentials/port | Check `docker ps` for the actual container and its port mapping; update `.env` files to match exactly |
| `BullMQ: Your redis options maxRetriesPerRequest must be null` | A BullMQ Worker/Queue was created without this required option | Add `maxRetriesPerRequest: null` to the Redis connection options passed to any BullMQ `Worker` or `Queue` constructor |
| `git commit` fails with "Please tell me who you are" | No git identity configured for this repo | `git config user.email "you@example.com"` and `git config user.name "Your Name"` (omit `--global` to scope it to just this repo) |
| Prisma migration says "not a git repository" or similar unrelated error | Usually a red herring — check the actual Prisma error above it, often a credentials or connection issue, not a git issue | Read the full error output, not just the last line |
