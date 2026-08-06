# Pulse Platform Standard — Non-Negotiable Baseline

**Scope of this standard**: Pulse is being built for a real, small-scale public launch —
real first users, on a single (or small) server, with the explicit goal that those users
feel they're using a genuinely professional, complete product and want to share it. This
document does NOT cover millions-of-concurrent-users infrastructure (load balancers,
multi-region failover, database sharding) — that is deliberately out of scope until there
is a real user base generating real load data to design against. Building that now would
waste budget on problems that don't exist yet. What follows is the complete standard for
"small-scale, professional-grade, launch-ready" — nothing in this scope is optional or
deferred to "later."

This document is referenced by short name ("apply the Pulse Platform Standard") in every
build prompt, so it never needs to be re-explained.

## 1. User Experience — must never feel unfinished
- Every screen has a real empty state, loading state, and error state — never a blank
  page or an unstyled browser error.
- Every action (vote, post opinion, share, create poll) gives immediate visual feedback —
  no dead clicks, no silent failures, no generic "Failed to X" without a specific,
  human-readable reason.
- Consistent design system across web and admin: same color palette, spacing, typography,
  component style — no page that looks like it was built by a different team.
- Every interactive element (buttons, links, forms) works on both desktop and mobile
  viewport widths.
- Loading states use skeleton screens or spinners, never a frozen-looking UI.
- The three-zone Facebook-style layout (left nav / center wall / right trending) is the
  default for every content-browsing page, not just the feed.

## 2. Virality mechanics — must actually work, not just exist as a stub
- Every shareable result has a real, tested, working share flow: generates an actual
  image/card, uses the native share sheet where available, falls back to download/copy
  link where not.
- The link embedded in every shared card goes to a genuinely working no-signup guest-vote
  page — this path must be tested end-to-end, not assumed.
- New user signup is frictionless: OTP flow must complete in under 3 taps/clicks from
  landing on a shared link to successfully voting.

## 3. Security — every feature, every time
- Every API route is protected by the correct auth guard and RBAC role check
  (USER / MODERATOR / ADMIN / SUPER_ADMIN) by default — never left open.
- Every user input is validated (Zod) at the API boundary before touching the database.
- No secrets, tokens, or credentials are ever hardcoded — environment variables only, and
  every new variable is added to `.env.example` in the same task it's introduced.
- Real secrets (JWT signing key, database password) must be strong random values before
  any deployment beyond localhost — placeholder dev values are flagged, never silently
  carried into a deployed environment.
- HTTPS is mandatory for any real deployment — no exceptions, even at small scale.

## 4. Compliance — must be real, not deferred, even at small scale
These are not "nice to have later." A public-facing platform handling phone numbers,
votes, and opinions in India needs these from day one of real users:
- DPDP-compliant consent screen at signup (explicit, non-pre-ticked, naming what data is
  collected and why).
- Grievance officer contact information visible somewhere in the app (footer or settings).
- Terms of Service and Privacy Policy pages, real content (not lorem ipsum), linked from
  signup.
- Age gate at signup (per the platform's stated minimum age policy).
- Election blackout logic (already built) must stay correctly enforced — this is a legal
  requirement, not a feature toggle.
- Data export/deletion request path for a user who asks (even a manual admin-assisted
  process is acceptable at this scale, but it must exist and be documented).

## 5. Admin & operator completeness — must be complete now, this is explicitly in-scope
- Logout, on both web and admin.
- Full role management UI (SUPER_ADMIN can view/change any user's role).
- Platform health/metrics visibility: user counts, content counts, worker status, API
  health, error rate — a real dashboard, not fake numbers.
- Audit trail for consequential admin actions (bans, role changes, election blackout
  changes): who, what, when.
- Every admin "manage X" feature includes full CRUD (or explicit archive/deactivate),
  a working list view, and correct empty/error states — matching Section 1's UX bar.

## 6. Consistency — no duplicate or half-finished features
- Before adding a new page or endpoint, check whether an equivalent already exists;
  consolidate or explicitly remove the old one in the same task, never leave two.
- New Zod schemas are checked against what the actual frontend form sends before being
  considered done — the "unrecognized_keys" class of bug must not recur.
- New database fields require a real, applied, verified-against-the-live-database
  migration — never just a schema file edit assumed to have taken effect.

## 7. Single-server production readiness — in scope now, this is not "later scaling"
This is the dividing line: getting one server to run this reliably and professionally is
in scope now. Getting many servers to run it at massive scale is not.
- A real process manager (PM2 or equivalent) or container restart policy so the API
  recovers automatically from a crash — "it stays up" is a requirement now, not a future
  scaling concern.
- Production Dockerfiles that actually build and run (not just exist as dev-mode stubs) —
  verified by actually building and running the production image at least once before
  calling this done.
- Basic uptime monitoring (even a free tier like UptimeRobot) so you know immediately if
  the single server goes down.
- Automated database backups (even a simple daily cron + off-server copy) — losing all
  data because a single server had a problem is not acceptable at any scale, including one
  server.
- Rate limiting on all public write endpoints by default, protecting the single server
  from being overwhelmed by abuse or a traffic spike, even before "millions of users"
  infrastructure exists.

## 8. Verification discipline — the rule that prevents false "done" reports
- Any claim that a migration "succeeded" or a fix "is in place" must be checked against
  the actual running database/app, not just a file existing on disk. If the dev
  environment isn't running at the time of checking, the report must say so explicitly.
- Typecheck passing is necessary but not sufficient — it confirms the code compiles, not
  that the feature works in the browser. Both must be confirmed before something is
  reported as finished.

---

## Explicitly OUT of scope for now (genuinely deferred, not being ignored)
- Multi-region deployment, active-active failover
- Database read replicas, sharding, connection-pool tuning for extreme concurrency
- CDN in front of dynamic content, distributed tracing, enterprise observability stacks
- Load/stress testing at millions-of-users scale
- Any infrastructure whose need can only be determined by real production traffic data
  that doesn't exist yet

These become in-scope the moment there's a real, growing user base generating real load —
not before, and not based on guessing.
