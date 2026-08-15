# Pulse Database Operations Runbook — Quick Reference

_For database operators, SREs, and deployment engineers. Short decision trees and commands for production emergencies._

---

## Part A: Immediate Actions (On-Call Emergency)

### Database Down / Unavailable

**Diagnosis (< 2 min):**
```bash
# Check if database is responding
psql -h <database-host> -U pulse_app -d pulse_prod -c "SELECT 1;"

# If timeout/refused: Check AWS console or hosting provider status
# If connection error: Check security group / firewall rules
```

**Action Tree:**

```
├─ Can't connect (connection refused / timeout)
│  ├─ Check RDS console → Status: "available" or "modifying"?
│  ├─ If "modifying": Wait 5-10 min (likely failover in progress)
│  ├─ If "available": Check security group allows API instance IPs
│  └─ If still down: Restore from most recent snapshot (see Section B)
│
├─ Connection timeout (connects but hangs)
│  ├─ Check CPU > 80%? → Scale instance size
│  ├─ Check connections at max? → Kill idle connections (see Part C)
│  └─ Check network latency > 100ms? → Investigate region/AZ issues
│
└─ Query returns "FATAL: database does not exist"
   └─ Restore from backup (see Section B)
```

### Replication Lag > 10 Seconds (Read Replica Issue)

**Diagnosis:**
```sql
-- On replica:
SELECT now() - pg_last_xact_replay_time() AS replication_lag;
-- If NULL, replication is caught up

-- On primary (check for stuck transactions):
SELECT pid, state, query, xact_start FROM pg_stat_activity
WHERE xact_start IS NOT NULL
ORDER BY xact_start ASC LIMIT 5;
```

**Action:**
```
├─ Lag 1–5 seconds (Normal, application should retry)
│  └─ No action needed; monitor for trend
│
├─ Lag 5–60 seconds (Network or replica load issue)
│  ├─ Check replica CPU/memory → Scale if needed
│  ├─ Check network bandwidth between primary and replica
│  ├─ If trending worse: Promote replica, fail over to new replica
│  └─ Investigate cause (slow query on primary?)
│
└─ Lag > 1 minute (Serious, failover recommended)
   ├─ Promote replica: ALTER SYSTEM SET recovery_target_timeline = 'latest';
   ├─ Verify promoted replica is writable
   ├─ Update app DATABASE_URL to point to new primary
   ├─ Create new replica from promoted primary
   └─ Alert engineering team
```

### High CPU / Slow Queries

**Diagnosis:**
```sql
-- Find expensive queries
SELECT query, calls, total_time, mean_time, stddev_time
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat%'
ORDER BY total_time DESC LIMIT 10;

-- Clear stats if needed (after deploying optimization)
SELECT pg_stat_statements_reset();
```

**Quick Fixes (1–5 min):**

```bash
# 1. Kill any runaway query
psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity
  WHERE query LIKE '%<PATTERN>%' AND state = 'active';"

# 2. Increase work_mem temporarily (allows large sorts)
psql -c "ALTER SYSTEM SET work_mem = '512MB'; SELECT pg_reload_conf();"

# 3. If STILL high after 2 min: Scale database instance size
# (In AWS console or Terraform)
```

**Medium-term Fix (< 1 hour):**
- [ ] Add index on slow query (from `pg_stat_statements`)
- [ ] Test index on staging database first
- [ ] Deploy index with `CONCURRENTLY` flag (no locks)

---

## Part B: Backup & Restore Procedures

### When to Restore

- Database corrupted, data loss detected
- Ransomware/security incident
- Accidental DDL (dropped table, truncated table)
- Data corruption from application bug

### Restore from AWS RDS Snapshot

**<15 minute RTO:**

```bash
# 1. List available snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier pulse-prod \
  --query 'DBSnapshots[].{SnapshotId:DBSnapshotIdentifier,Time:SnapshotCreateTime}' \
  --output table

# 2. Restore to new instance (read-only for safety)
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier pulse-prod-restored-$(date +%s) \
  --db-snapshot-identifier arn:aws:rds:...:snapshot:pulse-prod-20260815-0230 \
  --db-instance-class db.r6i.large

# 3. Wait for restore to complete (~5 min)
aws rds describe-db-instances \
  --db-instance-identifier pulse-prod-restored-1692129600 \
  --query 'DBInstances[0].DBInstanceStatus'

# 4. **BEFORE** promoting: Run validation queries
# (connect to restored instance)
psql -h pulse-prod-restored.xxxxx.amazonaws.com -U pulse_admin
  SELECT COUNT(*) FROM users;  -- Verify data sanity
  SELECT MAX(created_at) FROM polls;  -- Check timestamps are recent

# 5. If valid: Update DNS or app config to point to restored instance
# 6. Delete old instance
aws rds delete-db-instance --db-instance-identifier pulse-prod --skip-final-snapshot
```

### Restore from Point-in-Time (PITR)

**When:** To recover from accidental DELETE or UPDATE in last 7 days.

```bash
# 1. Find exact timestamp of problem
# (Usually from app logs: "user reported data missing at 2026-08-15 14:30 UTC")

# 2. Restore to specific point in time
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier pulse-prod \
  --target-db-instance-identifier pulse-prod-pitr-$(date +%s) \
  --restore-time '2026-08-15T14:29:59Z' \
  --db-instance-class db.r6i.large

# 3. Verify restored data
# 4. Failover to restored instance
# 5. Delete old instance
```

### Manual Backup & Restore (S3)

```bash
# Backup
pg_dump -h pulse-prod.xxxxx.amazonaws.com \
  -U pulse_admin \
  --format custom \
  --compress 9 \
  pulse_prod > /tmp/pulse_backup_$(date +%Y%m%d_%H%M%S).dump

aws s3 cp /tmp/pulse_backup_*.dump \
  s3://pulse-prod-backups/manual/ \
  --sse AES256

# Restore to empty database
createdb -h localhost -U pulse_admin pulse_prod_restored

pg_restore -h localhost -U pulse_admin \
  --exit-on-error \
  /tmp/pulse_backup_*.dump | psql -U pulse_admin -d pulse_prod_restored
```

---

## Part C: Connection & Resource Management

### Connection Pool Exhaustion

**Symptom:** API returns "connection timeout", but RDS shows normal CPU.

```bash
# 1. Check current connections
psql -c "SELECT count(*) FROM pg_stat_activity;" # Max usually 200

# 2. Identify connection hogs
psql -c "SELECT usename, client_addr, count(*) as connections 
  FROM pg_stat_activity GROUP BY 1, 2 ORDER BY 3 DESC;"

# 3. Kill idle connections (safe)
psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity
  WHERE state = 'idle' AND query_start < NOW() - INTERVAL '10 min';"

# 4. Check PgBouncer stats (if using pooler)
psql -h pgbouncer:6432 -U pgbouncer -d pgbouncer -c "show pools;"
```

### Memory / Work Memory Tuning

```bash
# Check memory usage
psql -c "SELECT * FROM pg_stat_activity WHERE memory_allocated > 104857600;" # > 100 MB

# Increase work_mem for heavy operations (sorts, joins)
psql -c "ALTER SYSTEM SET work_mem = '256MB';"
psql -c "SELECT pg_reload_conf();"
```

### Disk Space Low (< 10% remaining)

```bash
# Check disk usage by table
psql -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
  FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 20;"

# Quick cleanup options:
# 1. Increase storage (RDS: Add 100 GB)
# 2. Archive old audit logs: DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days';
# 3. Truncate logs table: TRUNCATE pg_log; (if exists)

# Increase storage in AWS (no downtime for RDS)
aws rds modify-db-instance \
  --db-instance-identifier pulse-prod \
  --allocated-storage 500 \
  --apply-immediately
```

---

## Part D: Common Maintenance Tasks (Weekly/Monthly)

### Weekly: Check Backup Status

```bash
# 1. Verify automated backup ran
aws rds describe-db-instances \
  --db-instance-identifier pulse-prod \
  --query 'DBInstances[0].{Status:DBInstanceStatus,LatestRestorableTime:LatestRestorableTime}'

# 2. Check S3 for manual backups (should have new file from last week)
aws s3 ls s3://pulse-prod-backups/weekly/ --recursive --human-readable | tail -20
```

### Monthly: Restore Test

```bash
# 1. Create staging instance from latest snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier pulse-staging-restore-test \
  --db-snapshot-identifier arn:aws:rds:...

# 2. Wait for restore
# 3. Run smoke tests
# 4. Document results
# 5. Delete staging instance
aws rds delete-db-instance --db-instance-identifier pulse-staging-restore-test --skip-final-snapshot
```

### Quarterly: Update Indexes

```sql
-- Find missing indexes
SELECT schemaname, tablename, seq_scan, idx_scan
FROM pg_stat_user_tables
WHERE (seq_scan + idx_scan) > 1000
  AND seq_scan > idx_scan * 10
ORDER BY seq_scan DESC;

-- Create index without locking table
CREATE INDEX CONCURRENTLY idx_new_index ON table_name (column_name);

-- Drop unused indexes
SELECT indexname FROM pg_stat_user_indexes WHERE idx_scan = 0;
DROP INDEX CONCURRENTLY index_name;
```

### Annually: Security Audit

- [ ] Rotate database passwords (both app and admin roles)
- [ ] Review IAM permissions (who can access backups, snapshots?)
- [ ] Verify encryption settings (at-rest, in-transit)
- [ ] Review audit logs for suspicious activity
- [ ] Update backup retention policy if needed

---

## Part E: Scaling Decision Tree

**Current User Count** → **Recommended Setup**

```
< 1K users
├─ Setup: db.t3.micro, single instance, no replica
├─ Cost: ₹500–800/month
└─ Action: Monitor; upgrade to db.t3.small at 5K users

1K–10K users
├─ Setup: db.t3.small or db.r6i.large, single instance
├─ Add read replica when: latency (p95) > 500ms
├─ Cost: ₹2,000–5,000/month
└─ Action: Plan replica deployment at 10K users

10K–50K users
├─ Setup: db.r6i.large (primary) + db.r6i.large (replica)
├─ Add PgBouncer: when connections approach max (> 180/200)
├─ Cost: ₹5,000–15,000/month
└─ Action: Plan for read/write split, auto-failover

50K+ users (Viral / B2B)
├─ Setup: Aurora PostgreSQL (auto-scaling) + 2–3 read replicas
├─ Add: Cross-region failover replica
├─ Cost: ₹25,000–80,000/month
└─ Action: Kubernetes deployment, multi-region strategy
```

---

## Part F: Emergency Contacts & Escalation

| Scenario | Action | Escalate After |
|----------|--------|-----------------|
| High CPU (> 80%) | Scale instance | 15 min if persisting |
| Replication lag > 10 sec | Check network, investigate slow query | 5 min |
| Disk space < 10% | Increase storage immediately | N/A (do now) |
| Can't connect (timeout) | Check security group, failover if needed | 2 min |
| Data corruption detected | Restore from snapshot | 1 min (emergency) |
| Unknown query spike | Check pg_stat_statements, kill if runaway | 5 min |

**Escalation Path:**
1. On-call DBA / Database engineer
2. Infrastructure team lead
3. CTO / VP Engineering

---

## Part G: Cost Optimization

**Reduce bills without sacrificing performance:**

```
✓ Right-size instance (monthly: check CPU/memory usage, consider smaller)
✓ Use Reserved Instances (commit to 1–3 years, save 40%)
✓ Archive old data (move audit logs, user activity > 2 years to S3)
✓ Use read replicas only when needed (latency > 500ms)
✓ Delete unused snapshots (AWS charges per GB for snapshot storage)
✓ Use Graviton2 instances (cheaper, faster than older Intel)
```

**Example cost reduction (Phase 1 → Phase 1.5):**
```
Before: db.t3.micro (₹1,200/month) + manual backups
After:  db.r6i.large (₹8,000) + replica (₹8,000) = ₹16,000
But:    10x performance improvement, handles 50K users
```

---

**Last Updated:** 2026-08-15  
**Version:** 1.0  
**Review Frequency:** Quarterly
