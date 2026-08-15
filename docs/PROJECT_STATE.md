# PollBooth — Project State

_Last updated: 2026-08-02, after end-to-end verification._

## What this is

PollBooth is a public sentiment and polling platform for India — admin-authored polls across
categories (Politics/Civic, Bollywood, Sports, Current Events), with a vote → optional
private reason → public 280-character opinion → agree/disagree reaction loop. No
anonymous messaging, no reply threads, no profile visits on opinions — by deliberate
design, to avoid the harassment patterns that sank comparable apps (Sarahah, Yolo, Kik).
Full vision, feature list, and rationale: see `POLLBOOTH.txt` in the repo root — treat that
as the source of truth for product intent.

## Tech stack

- **Monorepo**: pnpm workspaces + Turborepo
- **`apps/api`**: Express + TypeScript, Prisma ORM, PostgreSQL, Redis, BullMQ (background workers)
- **`apps/web`**: Next.js 14 — public-facing app (feed, voting, opinions, guest voting)
- **`apps/admin`**: Next.js 14 — admin dashboard (moderation queue, poll creation, user management, topic balance)
- **`packages/prisma`**: shared Prisma schema and migrations
- **`packages/shared-types`, `packages/utils`, `packages/ts-config`**: shared code across apps

## How to run it locally

1. Start the database and Redis (either via this project's `docker-compose.yml`, or point
   at an already-running Postgres/Redis instance — see note below on current setup).
2. Ensure these files exist with real values:
   - `packages/prisma/.env` → `DATABASE_URL="postgresql://<user>:<password>@localhost:<port>/<db>"`
   - `apps/api/.env` → same `DATABASE_URL`, plus `REDIS_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `NODE_ENV`, `PORT`
3. From the repo root: `pnpm install`
4. Run migrations: `cd packages/prisma && npx prisma migrate dev`
5. From the repo root: `pnpm dev`
6. Verify:
   - API health check: `http://localhost:3001/health` → should return `{"status":"ok",...}`
   - Web app: `http://localhost:3000`
   - Admin dashboard: `http://localhost:3002`

**Current known setup note**: during development, the project ended up running against a
standalone Postgres container (`pollbooth-postgres`, `postgres:15`, port 5433) rather than the
one defined in `docker-compose.yml` (port 5432). Before deploying or handing this off,
confirm which database is actually the source of truth and consolidate to one — see
"Known issues" below.

## Confirmed working (verified end-to-end, not just assumed)

- Phone OTP auth flow (send/verify, JWT issuance)
- Polls: admin creation, targeting fields, feed retrieval
- Votes: one-vote-per-user enforced at the database level (unique constraint, tested)
- Opinions: 280-char limit, one-per-poll, agree/disagree reactions, report → auto-hide threshold
- Moderation: escalation ladder (warning → 7-day → 30-day → permanent), voting rights preserved during opinion bans
- **Election blackout**: political-category polls auto-disabled during an active blackout window per region; non-political categories unaffected (schema + logic + migration all verified applied to a real database)
- **Sponsored vs. organic poll separation**: `is_commercial` flag excluded from organic trending/ranking calculations; sponsored polls returned as a separate field in the feed response; "Sponsored" label added to the poll card UI
- Background workers (digest, moderation sweep, notifications, cleanup) — registered, scheduled, and confirmed running on interval in the real dev environment
- Admin dashboard — boots and renders
- Web frontend — boots, renders a full styled landing page, confirmed live in a real browser
- Full stack boots together via `pnpm dev` with zero errors (API + web + admin + Redis + workers)

## Not yet built (known gaps, not oversights)

- **Mobile app** (Flutter) — not started
- **Automated tests** — no unit, integration, or E2E tests exist yet
- **CI/CD pipelines** — no GitHub Actions workflows yet
- **Production infrastructure** — no Terraform, no monitoring/observability stack, nothing deployed outside localhost
- **Push notifications** — Firebase not configured; the notification worker runs but skips actual delivery ("FCM delivery skipped; Firebase credentials not configured" is expected, not an error)
- Landing page stats ("1.2M+ voted this week", "24K+ referrals") are placeholder marketing copy, not wired to real data

## Known issues / things to check before going further

1. **Database consolidation**: the project has, at various points, connected to more than
   one local Postgres instance (a `docker-compose.yml`-defined one on 5432, and a
   standalone `pollbooth-postgres` container on 5433). Confirm which is authoritative before
   any further schema changes, to avoid migration drift.
2. **`.gitignore` / secrets**: confirm `.env` files are excluded from version control
   before this repo is ever pushed to a remote (GitHub, etc.) — they were created locally
   during development and may contain values that shouldn't be committed.
3. No automated regression testing exists yet — every verification so far has been manual
   (reading terminal output, browser checks). Before adding more features, prioritize at
   least minimal coverage on `votes` (uniqueness) and `moderation` (escalation ladder),
   since those are the modules where a silent regression would be hardest to notice and
   most damaging if wrong.

## Version control

Git history (as of last verified checkpoint):
```
5081cb5 - Verified working end-to-end: web, api, admin, workers, db all confirmed live
2253b6d - Fix BullMQ worker connection - full app boots cleanly
21189ef - Add election blackout feature - migration verified working
da3c85f - Initial commit: baseline
```
