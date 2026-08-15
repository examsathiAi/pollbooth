# Pulse — Security, Deployment, Scaling & Maintenance Guide

_This document exists so that anyone — a new developer, a hired team, or another AI
agent — can pick this project up without needing the original build conversation. It
covers what a production launch actually requires beyond "it runs on localhost," and is
honest about what has and hasn't been done yet._

---

## 0. Read this first: verification status

Everything under **"Confirmed working"** in `PROJECT_STATE.md` was verified by actually
running the app end-to-end on one developer's local Windows machine — real terminal
output, real browser checks, real database migrations. It was **not** reviewed by a
professional security auditor, has **not** been load-tested, and has **not** been
deployed to any real server. Treat "it works locally" and "it's production-ready" as two
different, unconnected claims. This document exists to close that gap, not to claim it's
already closed.

---

## 1. Security Checklist

Status of each item, matched against the project's own pre-launch standard (see
`PULSE.txt`, section 12):

| Item | Status | Notes |
|---|---|---|
| All code in version control | ✅ Done | Git initialized, real commit history exists |
| Secrets in `.env.example` only, real values kept out of git | ⚠️ **Verify before pushing anywhere** | `.env` files were created locally during development. Confirm `.gitignore` actually excludes them — check with `git status` after any `.env` edit, before committing |
| HTTPS only, HSTS enabled | ❌ Not done | App currently only runs on plain HTTP on localhost. Required before any real deployment — see Section 3 |
| Rate limiting on public endpoints | ⚠️ Partially — a `rate-limiter.ts` interceptor exists in the codebase | Confirm which routes actually use it; OTP endpoints specifically need enforcement of 3/hour, 10/day per the product spec |
| Input validation on every endpoint | ⚠️ Zod validation exists in some modules (e.g., auth) | Not yet confirmed present on every single route — audit before launch |
| ORM used for all queries (no raw SQL) | ✅ Confirmed | Prisma used throughout; no raw SQL found during development |
| CORS explicit allowlist | ⚠️ Needs verification | Check `apps/api/src/config` or `app.ts` for the current CORS config; must not be a wildcard in production |
| JWT secrets rotated (not demo values) | ❌ Not done | Current `.env` uses a placeholder secret (`dev-jwt-secret-min-32-chars-long-ok`) — **this must be replaced with a real, random, secret value before any real deployment** |
| PII hashed where possible | ✅ Confirmed | Phone numbers are hashed (`phone_hash`), not stored/queried in plaintext |
| Dependency audit | ❌ Not yet run | Run `pnpm audit` before launch and address any high/critical findings |
| Encryption at rest | ❌ Not applicable yet | Only relevant once on a real managed database (e.g., AWS RDS enables this by default) |
| Backup strategy | ❌ Not done | No backup process exists for the local database. Must be established before any real user data is stored anywhere permanent |

**Before this app touches any real user data, the following are non-negotiable, not optional:**
1. Replace every placeholder secret (`JWT_SECRET`, database passwords) with real, randomly generated values
2. Confirm `.env` files are git-ignored
3. Enable HTTPS
4. Run and clear a dependency audit
5. Set up a real backup process for the database

---

## 2. Compliance Status (India-specific, from `PULSE.txt` section 5)

| Requirement | Status |
|---|---|
| Election blackout (political polls disabled during ECI-announced periods) | ✅ Built and verified — schema, logic, and migration confirmed working |
| No exit polls | ✅ By design — the platform has no exit-poll feature at all |
| DPDP consent recording | ⚠️ A `consent` module exists in the backend; **not confirmed whether the actual signup UI shows an explicit, non-pre-ticked consent screen** — verify in `apps/web` before launch |
| Grievance officer contact visible | ❌ Not confirmed present in the web app UI — needs a dedicated page/section |
| Age gate (16+) | ❌ Not confirmed enforced at signup — verify in the auth flow |
| Report button on every opinion | ✅ Confirmed — built into the opinions module and `PollCard`/opinion UI |
| Block user function | ✅ Confirmed present in the moderation module |
| Sponsored content separated from organic | ✅ Built and verified |
| Data localization (India-region hosting) | ❌ Not applicable yet — currently local-only; must be enforced when choosing a cloud region (see Section 3) |

**Do not treat "the backend module exists" as "the compliance requirement is met."** Several
of the ❌/⚠️ items above have working backend support but need their frontend/UX
counterpart confirmed before they count as actually satisfied.

---

## 3. Deployment (Local → Real Server)

Nothing below has been executed yet — this is the path forward, not a record of what's done.

### Phase 0 — First deployment (target: ₹3,000–6,000/month, or ₹0 using free tiers)

1. **Choose hosting**: Oracle Cloud free-tier ARM VM (genuinely free indefinitely) for
   the earliest stage, or a low-cost provider (Railway/Render/Fly.io) if simplicity is
   valued over cost. AWS EC2 t3.medium (~₹3,000/month) is the standard once free tiers
   are outgrown.
2. **Database**: managed Postgres (AWS RDS free tier for the first year, or Supabase/Neon
   free tier) rather than self-hosting, once past pure local development — self-hosting
   Postgres is fine for now, but the backup/failover risk is not worth it once real users
   depend on the data.
3. **Data residency**: per `PULSE.txt`, all user data must be stored in India
   (AWS `ap-south-1`, Mumbai) with backups in `ap-south-2` (Hyderabad) — this is a
   DPDP-related decision, not just a performance one. Factor this into hosting choice.
4. **HTTPS**: Let's Encrypt (free) via the hosting provider or a reverse proxy (Caddy or
   nginx with certbot) — non-negotiable before real users touch this.
5. **Environment variables**: move from local `.env` files to the hosting provider's
   secrets mechanism, or at minimum ensure `.env` is never present in any deployed
   container image or public location.
6. **Process management**: `pnpm dev` (with `tsx watch`) is a **development** command —
   it is not meant to run a production server. Before deploying, the API needs a real
   build step (`pnpm build`) and a production start command, run under a process
   manager (PM2 or systemd) or a container orchestrator, so it restarts automatically if
   it crashes.

### Phase 1+ — Growth

See `PULSE.txt` section 10 ("Bootstrapped Scaling Roadmap") for the full phase-by-phase
cost table (Phase 0 through Phase 3, roughly ₹3K/month through ₹1.5L+/month). The
short version: add a read replica when API latency exceeds 500ms, add Multi-AZ after
the first real downtime incident, and do not introduce Kubernetes or microservices
until Phase 3 — the current modular-monolith architecture is intentionally built to
delay that need, not avoid it forever.

---

## 4. Monitoring & Observability

**Currently in place**: structured JSON logging via Winston (visible in local dev
output — e.g., `{"environment":"development","service":"pulse-api",...}`).

**Database Monitoring:**
See [DATABASE_SECURITY_AND_SCALING.md](./DATABASE_SECURITY_AND_SCALING.md) for
comprehensive production database setup, including connection pooling, scaling for peak
users, B2B configurations, backup/restore procedures, and DPDP compliance.

**Key database metrics to monitor in production:**
- CPU utilization > 80%, connections > 90% of max, replication lag > 10 seconds
- Query execution time (p95), full-table scans, temp file creation
- Storage space remaining, failed authentication attempts

**Not yet in place, needed before real launch**:
- Error tracking (Sentry free tier is the standard starting point)
- API metrics dashboard (Grafana + self-hosted Prometheus, or CloudWatch if on AWS)
- Business metrics tracking (e.g., Mixpanel)
- Alerting — specifically, an alert when the **moderation queue** exceeds a defined
  threshold (PULSE.txt suggests 50 items) is a safety-critical alert, not a nice-to-have,
  given this platform's content-moderation commitments
- A defined on-call process — even if it's a single person, this should be written down

---

## 5. Testing Status

**No automated tests exist yet.** All verification to date has been manual (reading
terminal output, browser checks, one-off API calls). This is the single largest gap
between "confirmed working" and "production-ready."

Priority order for adding tests, based on where a silent bug would be most damaging:
1. **`votes` module** — the one-vote-per-user uniqueness constraint. A regression here
   corrupts poll integrity silently.
2. **`moderation` module** — the escalation ladder logic. A regression here could either
   under-moderate (safety risk) or over-ban users (fairness/trust risk).
3. **`consent` module** — state transitions and revocation. A regression here is a
   compliance risk, not just a bug.
4. **Auth flow** (OTP → JWT) — integration test covering the full send/verify/token cycle.
5. Everything else, as capacity allows.

---

## 6. Maintenance Notes for Whoever Picks This Up Next

- **Read `PULSE.txt` first.** It is the full product vision and the reason behind every
  non-obvious design decision (e.g., why there's no reply button on opinions, why
  election polls have a blackout window, why sponsored polls are kept structurally
  separate from organic ones). Don't "simplify" these away without understanding why
  they exist — several were added specifically because an earlier, less safe version of
  this product concept was considered and rejected.
- **Read `ARCHITECTURE.md`** for the module map and the one hard rule that keeps this
  codebase maintainable: modules should only talk to each other through their exported
  service functions, never by reaching into another module's internals directly.
- **Check `PROJECT_STATE.md`** for exactly what's confirmed working versus assumed —
  don't trust a feature is done just because a file with the right name exists; several
  gaps were found during development specifically because a file existed but was empty,
  broken, or never actually wired up.
- **This document (Security/Deployment/Scaling)** should be updated every time a Section
  1 or Section 2 item moves from ❌/⚠️ to ✅ — keep it honest, since its entire value is
  in being an accurate checklist, not an aspirational one.
