# P2 Execution Checklist

This is the operational launch checklist for the next phase after P1 code/app hardening. Items marked as "deployment-only" cannot be fully executed in a local repo and must be completed in the target hosting environment.

## 1. Deployment & environment

- [ ] Provision a real hosting environment for the API and web app
- [ ] Choose an India-region database and backup strategy
- [ ] Configure a production HTTPS reverse proxy or managed TLS termination
- [ ] Move real secrets out of local files and into a secret manager or provider vault
- [ ] Set `NODE_ENV=production` only in the target environment
- [ ] Set production `CORS_ALLOWED_ORIGINS` to an explicit allowlist only
- [ ] Require non-placeholder `JWT_SECRET` and `ENCRYPTION_KEY` values in production
- [ ] Verify there is no `.env` or secrets file in the deployed image or artifact
- [ ] Configure a production process manager or container orchestration for restart policies

## 2. Compliance & product safety

- [ ] Confirm the signup screen explicitly captures DPDP consent and does not pre-tick it
- [ ] Confirm the age gate (16+) is enforced before account creation
- [ ] Verify the grievance officer contact is visible in UI/legal pages
- [ ] Check the app uses consistent moderation escalation and report-state flows
- [ ] Confirm sponsored/organic content separation is visible and enforced in UI/data logic
- [ ] Verify election blackout logic is enforced in production and cannot be bypassed

## 3. Monitoring & observability

- [ ] Add error tracking (for example, Sentry)
- [ ] Configure API metrics and dashboards
- [ ] Configure business analytics tracking
- [ ] Add moderation queue alerting when queue exceeds threshold
- [ ] Define a single on-call owner and incident response runbook
- [ ] Capture deploy success and rollback steps in writing

## 4. Security & dependency hygiene

- [ ] Run `pnpm audit` and fix/accept all high and critical issues
- [ ] Re-run access review for admin and moderator roles
- [ ] Confirm rate limiting is enforced on all public and sensitive endpoints
- [ ] Re-check session and refresh token handling for expiration and rotation
- [ ] Review outgoing third-party integrations for secret exposure and least privilege

## 4.1 Database Security (Critical for B2B & Peak Users)

**Read:** [DATABASE_SECURITY_AND_SCALING.md](./DATABASE_SECURITY_AND_SCALING.md) — Comprehensive guide for production database management.

- [ ] **Authentication:** Create separate database roles for app (`pulse_app`) and migrations (`pulse_admin`) with least-privilege permissions
- [ ] **Encryption:** Enable at-rest encryption for RDS (AES-256) and in-transit SSL/TLS (sslmode=require)
- [ ] **Connection Pooling:** Set `DATABASE_POOL_SIZE` based on concurrency model (20 for 100–5K users, scale upward for peak)
- [ ] **If scaling to 5K+ concurrent users:** Implement PgBouncer or AWS RDS Proxy for connection pooling (50–100 connection pool)
- [ ] **Read Replica (if 10K+ users):** Add read-only replica, configure read/write split in application
- [ ] **Backup Strategy:** Enable automated snapshots (14-day retention) + point-in-time recovery (7 days) + weekly S3 export
- [ ] **Disaster Recovery:** Test monthly restore procedure (create staging clone, run smoke tests, document results)
- [ ] **Monitoring:** Set up CloudWatch alarms for CPU > 80%, connections > 90%, replication lag > 10 sec, free storage < 10%
- [ ] **Indexes:** Review slow-query log (`pg_stat_statements`) and add missing indexes on WHERE/JOIN columns
- [ ] **DPDP Compliance:** Verify audit logs, consent tracking, and right-to-deletion cascade working correctly
- [ ] **Migration Safety:** Implement blue/green deployments for schema changes; test rollback procedure

## 5. Quality gates before production launch

- [ ] Auth flow test: OTP send → verify → JWT token issuance
- [ ] Votes integrity test: one vote per user per poll
- [ ] Moderation workflow test: report → queue → human decision → final state
- [ ] Consent flow test: accept/revoke state transitions
- [ ] Smoke test on the hosted environment after deployment
- [ ] Restore test for production database backups

## 6. Definition of done

The application can move to a real production launch only when all boxes above are checked, the app is running behind HTTPS, and the target infrastructure has a verified backup and alerting path.
