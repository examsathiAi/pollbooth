# PollBooth — Architecture Reference

## Overall shape

A modular monolith backend (`apps/api`), not microservices — one deployable Express
service, internally organized into one folder per business domain under
`apps/api/src/modules/`. Each module owns its own controller (routes), service (business
logic + Prisma queries), and types file. This was a deliberate choice for this project's
stage: easier to debug (one process, one log stream) than microservices, while still
keeping domains cleanly separated so a future split is possible if genuinely needed.

**Rule for future work**: a module should only reach into another module through its
exported service functions, never by importing another module's Prisma queries or
internal helpers directly. This is what keeps the codebase splittable later without a
rewrite.

## Module-by-module

- **`auth`** — Phone OTP send/verify, JWT access + refresh token issuance and rotation.
- **`users`** — User profile, progressive demographic profiling (age bracket, gender,
  state, education, income, employment, vehicle — collected one field at a time,
  contextually, per the gating design in `POLLBOOTH.txt`).
- **`polls`** — Poll CRUD, targeting-filter logic, estimated-reach calculation,
  auto-assignment of targeted polls to matching users, election blackout enforcement,
  sponsored/organic separation in listing queries.
- **`votes`** — Vote submission with a database-level unique constraint on
  `(user_id, poll_id)` — this is the actual integrity guarantee, not just application logic.
- **`opinions`** — 280-character public opinion posting (one per poll per user, 15-minute
  edit/delete window), agree/disagree reactions, profanity pre-filter (Layer 1 of
  moderation), report submission.
- **`moderation`** — Three-layer moderation pipeline (keyword filter, ML toxicity hook,
  community reports), the escalating consequence ladder (warning → 7-day ban → 30-day ban
  → permanent ban, with voting rights always preserved separately from opinion-posting
  rights), auto-hide at report threshold, user blocking.
- **`feed`** — For You / Trending / Local feed assembly, sponsored-vs-organic response
  shaping, related-polls and digest-card injection logic.
- **`badges`** — Gamification: streaks, percentile-based badges, Community Curator credit.
- **`civic`** — User-submitted civic issue reports and the admin approval-to-poll pipeline.
- **`surveys`** — General poll-suggestion pipeline (distinct from civic reports), admin
  review queue.
- **`consent`** — DPDP-style consent recording and revocation records.
- **`admin`** — Dashboard stats, user management (ban/unban), question topic-balance
  tracking, election blackout admin endpoint.
- **`notifications`** — Push notification queueing (FCM integration present but requires
  real Firebase credentials to actually deliver; currently a documented no-op in dev).
- **`payments`** — Earnings tracking, withdrawal, subscription handling.
- **`analytics`** — Aggregated reporting with minimum-cohort-size enforcement, matching the
  "never sell individual data" commitment in `POLLBOOTH.txt`.

## Background workers (`apps/api/src/jobs`)

Run via BullMQ against the same Redis instance as the rest of the app.
- `digest.worker.ts` — generates the daily "What India Thinks" digest content
- `moderation.worker.ts` — periodic sweep of the moderation queue
- `notification.worker.ts` — batched push notification delivery
- `cleanup.worker.ts` — data-retention purge (guest votes, soft-deleted records)

**Important gotcha, already fixed once**: BullMQ requires `maxRetriesPerRequest: null`
explicitly set on any Redis connection options used by a Worker or Queue. Without it,
every worker fails silently at startup with a misleading `Cannot read properties of
undefined (reading 'client')` error. If a new worker is added later, this setting must be
copied over — it's not the Redis client's default.

## Database

PostgreSQL via Prisma. Key design conventions already in place:
- UUID primary keys (`gen_random_uuid()`)
- `created_at` / `updated_at` on records where relevant
- Unique constraints doing real work, not just documented as a rule — e.g.,
  `(user_id, poll_id)` on both `Vote` and `Opinion` tables, enforced at the database
  layer, not just checked in application code.

## Frontend apps

- **`apps/web`** — Next.js 14, App Router. Public-facing: landing page, feed, poll detail,
  auth (OTP login), guest voting via `/p/[guestPollId]`, privacy/terms pages, rewards page.
- **`apps/admin`** — Next.js 14, separate app (not a route inside `apps/web`) for
  role-gated admin tooling: moderation queue, survey approvals, topic balance dashboard,
  user management.
