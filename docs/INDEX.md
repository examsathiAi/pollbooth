# Pulse — Production Documentation Index

_Complete reference for deploying, scaling, and operating Pulse at production scale._

---

## Core Documentation

### For Developers & Engineers

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [SETUP.md](./SETUP.md) | Local development environment setup | First time setting up project |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture, module map, design decisions | Understanding codebase structure |
| [PROJECT_STATE.md](./PROJECT_STATE.md) | Current implementation status, what's done/incomplete | Checking feature status |
| [PULSE_PLATFORM_STANDARD.md](./PULSE_PLATFORM_STANDARD.md) | Product vision, feature requirements, compliance rules | Product design decisions |

### For Production Deployment & Operations

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [SECURITY_AND_DEPLOYMENT.md](./SECURITY_AND_DEPLOYMENT.md) | Security checklist, deployment overview, monitoring basics | Pre-launch checklist |
| **[DATABASE_SECURITY_AND_SCALING.md](./DATABASE_SECURITY_AND_SCALING.md)** | **Database hardening, connection pooling, B2B scaling, DPDP compliance** | **Production DB setup (priority)** |
| **[DATABASE_OPERATIONS_RUNBOOK.md](./DATABASE_OPERATIONS_RUNBOOK.md)** | **Emergency procedures, backup/restore, on-call troubleshooting** | **During incidents or routine ops** |
| [P2_EXECUTION_CHECKLIST.md](./P2_EXECUTION_CHECKLIST.md) | Full pre-launch checklist (deployment + compliance + testing) | Final launch readiness review |

### Compliance & Legal

| Document | Purpose |
|----------|---------|
| [PRIVACY_POLICY.md](./PRIVACY_POLICY.md) | User privacy commitments |
| [TERMS_AND_CONDITIONS.md](./TERMS_AND_CONDITIONS.md) | User agreement terms |
| [GRIEVANCE_REDRESSAL_PROCESS.md](./GRIEVANCE_REDRESSAL_PROCESS.md) | Grievance officer process (DPDP requirement) |

---

## Quick Navigation by Role

### I'm a Backend Developer

1. [SETUP.md](./SETUP.md) — Local environment
2. [ARCHITECTURE.md](./ARCHITECTURE.md) — Module structure
3. [DATABASE_SECURITY_AND_SCALING.md](./DATABASE_SECURITY_AND_SCALING.md#2-connection-management--concurrency) — Connection pool config

### I'm a DevOps / Infrastructure Engineer

1. [SECURITY_AND_DEPLOYMENT.md](./SECURITY_AND_DEPLOYMENT.md#3-deployment-local--real-server) — Initial deployment
2. [DATABASE_SECURITY_AND_SCALING.md](./DATABASE_SECURITY_AND_SCALING.md) — Database hardening & scaling
3. [DATABASE_OPERATIONS_RUNBOOK.md](./DATABASE_OPERATIONS_RUNBOOK.md) — On-call procedures
4. [P2_EXECUTION_CHECKLIST.md](./P2_EXECUTION_CHECKLIST.md) — Pre-launch verification

### I'm a Product Manager / Business Owner

1. [PULSE_PLATFORM_STANDARD.md](./PULSE_PLATFORM_STANDARD.md) — Features & roadmap
2. [PROJECT_STATE.md](./PROJECT_STATE.md) — What's built
3. [P2_EXECUTION_CHECKLIST.md](./P2_EXECUTION_CHECKLIST.md#2-compliance--product-safety) — Compliance requirements

### I'm Going On-Call (Database Duty)

1. [DATABASE_OPERATIONS_RUNBOOK.md](./DATABASE_OPERATIONS_RUNBOOK.md#part-a-immediate-actions-on-call-emergency) — Emergency response
2. [DATABASE_SECURITY_AND_SCALING.md](./DATABASE_SECURITY_AND_SCALING.md#9-troubleshooting-common-issues) — Detailed troubleshooting
3. Bookmark [DATABASE_OPERATIONS_RUNBOOK.md#part-f-emergency-contacts--escalation](./DATABASE_OPERATIONS_RUNBOOK.md#part-f-emergency-contacts--escalation) — Escalation contacts

---

## Key Topics at a Glance

### Database Security (Production Must-Have)

**Read:** [DATABASE_SECURITY_AND_SCALING.md § 1](./DATABASE_SECURITY_AND_SCALING.md#1-database-security)

Topics covered:
- ✅ Authentication & network access (role separation, SSL/TLS)
- ✅ Encryption at rest & in transit
- ✅ Least-privilege database roles
- ✅ SQL injection prevention (Prisma protection)
- ✅ PII handling (phone_hash, FCM tokens, IP addresses)

### Scaling for Peak Users & B2B

**Read:** [DATABASE_SECURITY_AND_SCALING.md § 3](./DATABASE_SECURITY_AND_SCALING.md#3-peak-user--b2b-scaling)

Topics covered:
- ✅ Load testing benchmarks (1K → 10K → 50K+ users)
- ✅ Phase-by-phase scaling (Phase 0 soft launch → Phase 2 enterprise)
- ✅ Connection pooling tuning (pool size formula)
- ✅ Read/write split for 10K+ users
- ✅ Query performance monitoring (N+1 detection, slow query logs)

### Backup & Disaster Recovery

**Read:** [DATABASE_SECURITY_AND_SCALING.md § 4](./DATABASE_SECURITY_AND_SCALING.md#4-backup--disaster-recovery) & [DATABASE_OPERATIONS_RUNBOOK.md § B](./DATABASE_OPERATIONS_RUNBOOK.md#part-b-backup--restore-procedures)

Topics covered:
- ✅ RTO/RPO targets (1 hour acceptable loss)
- ✅ Automated snapshots vs. point-in-time recovery vs. manual exports
- ✅ Restore procedures (AWS RDS, manual pg_dump)
- ✅ Monthly restore drills (testing procedure)

### Emergency Troubleshooting

**Read:** [DATABASE_OPERATIONS_RUNBOOK.md](./DATABASE_OPERATIONS_RUNBOOK.md)

Topics covered:
- ✅ Database down / unavailable (diagnosis & action tree)
- ✅ Replication lag (symptoms & fixes)
- ✅ High CPU / slow queries (quick fixes & long-term solutions)
- ✅ Connection exhaustion (pool management)
- ✅ Disk space running low (cleanup & expand)

### Compliance & Audit (DPDP)

**Read:** [DATABASE_SECURITY_AND_SCALING.md § 8](./DATABASE_SECURITY_AND_SCALING.md#8-compliance--audit)

Topics covered:
- ✅ Audit logging (all data access tracked)
- ✅ Consent tracking (DPDP requirement)
- ✅ Right-to-deletion (cascade delete with audit trail)
- ✅ Data export (user can request all their data)
- ✅ Encryption & data retention policies

---

## Pre-Launch Checklist

Before going live to real users:

### Code-Level (✅ Already Done)
- [x] TypeScript passes type checking
- [x] ESLint passes linting
- [x] Build succeeds (pnpm build)
- [x] Tests pass (pnpm test)
- [x] Security hardening applied (HSTS, CSP, rate limiting)
- [x] Env validation (rejects placeholder secrets in production)

### Database-Level (See [DATABASE_SECURITY_AND_SCALING.md § 1–4](./DATABASE_SECURITY_AND_SCALING.md))

**Required Before First User:**
- [ ] Database authentication: Separate `pulse_app` and `pulse_admin` roles
- [ ] Encryption: At-rest (RDS AES-256) + in-transit (SSL/TLS)
- [ ] Backup enabled: Automated snapshots (14-day retention) + PITR (7 days)
- [ ] Monitoring: CloudWatch alarms configured
- [ ] Region: Data in ap-south-1 (Mumbai), backups in ap-south-2 (Hyderabad)

**Required Before 10K Users:**
- [ ] Read replica: Deployed and tested
- [ ] Connection pooling: PgBouncer or RDS Proxy configured
- [ ] Read/write split: Application code updated

**Required Before Enterprise / B2B (50K+ users):**
- [ ] Aurora PostgreSQL: Auto-scaling replicas
- [ ] Cross-region failover: Replicated to different country
- [ ] Multi-AZ: Automatic failover enabled

### Deployment-Level (See [P2_EXECUTION_CHECKLIST.md](./P2_EXECUTION_CHECKLIST.md))

- [ ] HTTPS enabled (TLS 1.2+, HSTS header)
- [ ] Secrets manager: Non-placeholder `JWT_SECRET`, `ENCRYPTION_KEY`
- [ ] Environment config: `NODE_ENV=production`, explicit CORS origins
- [ ] Process manager: PM2, systemd, or Kubernetes with auto-restart
- [ ] Monitoring: Sentry (error tracking) + CloudWatch (metrics)
- [ ] On-call: Defined role, runbook, escalation path

### Testing (See [P2_EXECUTION_CHECKLIST.md § 5](./P2_EXECUTION_CHECKLIST.md#5-quality-gates-before-production-launch))

- [ ] Auth flow test: OTP send → verify → JWT token
- [ ] Vote integrity: One vote per user per poll (concurrency tested)
- [ ] Moderation flow: Report → queue → decision → enforcement
- [ ] Consent flow: Accept/revoke transitions working
- [ ] Database restore: Tested monthly and documented
- [ ] Smoke test: Full end-to-end on production environment

---

## Useful Commands

### Local Development
```bash
# Start local dev environment
docker-compose up

# Run type check, lint, tests
pnpm typecheck && pnpm lint && pnpm test

# Run database migration
pnpm prisma migrate deploy

# Reset local database
pnpm prisma migrate reset
```

### Production Troubleshooting

See [DATABASE_OPERATIONS_RUNBOOK.md](./DATABASE_OPERATIONS_RUNBOOK.md) for detailed commands.

```bash
# Check database connectivity
psql -h <db-host> -U pulse_app -d pulse_prod -c "SELECT 1;"

# View slow queries
psql -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"

# Check connections
psql -c "SELECT COUNT(*) FROM pg_stat_activity;"

# Restore from snapshot (AWS)
aws rds restore-db-instance-from-db-snapshot ...

# View backup status
aws rds describe-db-instances --db-instance-identifier pulse-prod
```

---

## FAQ

**Q: Do I need to set up everything in DATABASE_SECURITY_AND_SCALING.md before launching?**

A: No. Start with core security (§ 1) + backup strategy (§ 4). Add scaling (§ 3) as you approach 10K users. Review § 2 & § 9 for on-call operations.

**Q: What's the minimum database cost in production?**

A: ₹500–1,000/month (db.t3.micro + automated backups). Single instance is fine for < 1K users.

**Q: When should I add a read replica?**

A: When API latency (p95) exceeds 500ms or database CPU regularly > 70%. Typical: around 10K users.

**Q: How long does a database restore take?**

A: RDS snapshots: 5–15 min. Point-in-time recovery: 5–10 min. Manual pg_dump: depends on size (10 GB = ~2 min).

**Q: Can I skip DPDP compliance for beta?**

A: No. DPDP applies to all services collecting Indian user data. Must be implemented before any production user account creation. See § 8 in DATABASE_SECURITY_AND_SCALING.md.

---

## Support & Escalation

- **Database questions:** Post in engineering Slack #database-ops
- **Security questions:** Post in #security-team or email security@pulse.co
- **On-call incident:** Call duty engineer (number in [DATABASE_OPERATIONS_RUNBOOK.md § F](./DATABASE_OPERATIONS_RUNBOOK.md#part-f-emergency-contacts--escalation))

---

**Last Updated:** 2026-08-15  
**Maintained By:** Infrastructure & Database Team  
**Review Cycle:** Quarterly
