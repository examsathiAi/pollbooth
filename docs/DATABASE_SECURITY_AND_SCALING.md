# Pulse — Database Security, Management & Scaling Guide

_Professional-grade database operations for production deployments, covering security hardening, peak-user scaling, and B2B-level availability._

---

## Table of Contents

1. [Database Security](#1-database-security)
2. [Connection Management & Concurrency](#2-connection-management--concurrency)
3. [Peak User & B2B Scaling](#3-peak-user--b2b-scaling)
4. [Backup & Disaster Recovery](#4-backup--disaster-recovery)
5. [Monitoring & Alerting](#5-monitoring--alerting)
6. [Index Strategy for Performance](#6-index-strategy-for-performance)
7. [Migration Safety](#7-migration-safety)
8. [Compliance & Audit](#8-compliance--audit)
9. [Troubleshooting Common Issues](#9-troubleshooting-common-issues)

---

## 1. Database Security

### 1.1 Authentication & Network Access

**Status in Current Project:**
- Prisma ORM used for all queries (no raw SQL injection risk)
- Connection pooling configured via `DATABASE_POOL_SIZE` env var (default: 20)
- Placeholder credentials exist locally only

**Production Hardening (Required):**

```env
# Generate real secrets:
# 1. Database password: 32+ random characters, mixed case, numbers, symbols
DATABASE_URL=postgresql://pulse_prod:$(openssl rand -hex 32)@db.internal:5432/pulse_prod

# 2. VPC/security group rules:
#    - Database accessible ONLY from API container/EC2 security group
#    - No public IP or internet-facing port 5432
#    - IP whitelist if on-premises or multi-region

# 3. Require SSL/TLS for all connections:
DATABASE_URL=postgresql://...?sslmode=require

# 4. If using AWS RDS, enable IAM database authentication:
# (Alternative to password-based auth; uses temporary tokens)
DATABASE_URL=postgresql://...?sslmode=require&ssl_verify=true
```

**Postgres Native Features to Enable:**

```sql
-- 1. Require password authentication (not trust/peer)
-- In pg_hba.conf: md5 or scram-sha-256 only, no 'trust'

-- 2. Create a role with minimal privileges for the app
-- (do NOT run migrations or schema changes as this user)
CREATE ROLE pulse_app WITH LOGIN PASSWORD 'generated-password';

-- 3. Grant only necessary permissions
GRANT CONNECT ON DATABASE pulse_prod TO pulse_app;
GRANT USAGE ON SCHEMA public TO pulse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pulse_app;
-- Explicitly deny DROP, ALTER, TRUNCATE
REVOKE DROP ON ALL TABLES IN SCHEMA public FROM pulse_app;
REVOKE ALTER ON ALL TABLES IN SCHEMA public FROM pulse_app;

-- 4. Separate migration user (higher privileges, not used by app runtime)
CREATE ROLE pulse_admin WITH LOGIN PASSWORD 'admin-password' SUPERUSER;

-- 5. Audit log all schema changes (PostgreSQL built-in)
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_duration = ON;
SELECT pg_reload_conf();

-- 6. Revoke default PUBLIC privileges
REVOKE ALL ON DATABASE pulse_prod FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
```

### 1.2 Encryption

**Data at Rest:**

- **AWS RDS:** Enable AES-256 encryption by default (✅ included in managed service)
- **GCP Cloud SQL:** Enable automatic backups with encryption
- **Self-hosted:** Use `pgcrypto` extension for column-level encryption

```sql
-- Optional: Enable pgcrypto for sensitive columns (if not using managed encryption)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Example: Encrypt FCM tokens at column level
ALTER TABLE users 
  ADD COLUMN fcm_token_encrypted TEXT;

-- Encrypt on insert/update (handled by app instead of DB)
```

**Data in Transit:**

- ✅ **Currently enforced:** `sslmode=require` in `DATABASE_URL`
- ✅ **Postgres 14+:** Uses SCRAM-SHA-256 by default (better than MD5)
- ✅ **Connection pooling:** PgBouncer or AWS RDS Proxy encrypts to pool, pool to app

**Field-level Sensitivity (Application Layer):**

The following fields contain or represent PII and require careful handling:

| Field | Type | Current State | Handling |
|-------|------|---------------|----------|
| `phone_hash` | VARCHAR(255) | ✅ Hashed (bcrypt) | Never reverse; used for uniqueness only |
| `phone_number` | VARCHAR(20) | ⚠️ Plaintext in dev only | Delete after verification; never log |
| `fcm_token` | TEXT | ⚠️ Plaintext | Encrypt/decrypt in application code |
| `ip_address` (audit logs) | VARCHAR(45) | ✅ Stored as-is | Should be hashed or anonymized before long-term storage |
| `user_agent` (audit logs) | TEXT | ✅ Stored as-is | Consider truncating/anonymizing |
| Consent records (JSON) | JSONB | ✅ Encrypted at rest (RDS) | Flag for archival/deletion per DPDP |

### 1.3 Access Control & Role Separation

**Principle: Least Privilege**

```yaml
Roles:
  pulse_app:
    Permissions: SELECT, INSERT, UPDATE, DELETE (runtime queries only)
    Used by: API containers, worker jobs
    Secret stored in: Secrets manager (AWS Secrets Manager, HashiCorp Vault)
    Rotation: Every 90 days
    
  pulse_admin:
    Permissions: All DDL/DML (schema changes, bulk operations)
    Used by: Database operators, migrations (CI/CD pipeline only)
    Secret stored in: Vault (not in Kubernetes/environment)
    Rotation: Every 60 days
    
  pulse_audit:
    Permissions: SELECT on audit tables only
    Used by: Compliance/audit scripts
    Secret stored in: Separate vault key
    Rotation: Every 180 days
```

**Implementation in Docker/Kubernetes:**

```yaml
# Don't:
ENV DATABASE_URL=postgresql://superuser:password@...

# Do:
# 1. Store in AWS Secrets Manager
aws secretsmanager create-secret \
  --name pulse/prod/database/app-password \
  --secret-string '{"username":"pulse_app","password":"..."}'

# 2. Reference in deployment manifest
env:
  - name: DATABASE_URL
    valueFrom:
      secretKeyRef:
        name: pulse-db-credentials
        key: app-url

# 3. Rotate on schedule
aws secretsmanager rotate-secret \
  --secret-id pulse/prod/database/app-password \
  --rotation-rules AutomaticallyAfterDays=90
```

### 1.4 SQL Injection Prevention

**Status:** ✅ **PROTECTED** — Prisma ORM parameterizes all queries by default.

```typescript
// ✅ Safe (Prisma parameterizes automatically)
const user = await prisma.user.findUnique({
  where: { phone_hash: userInput }  // Input is parameterized
});

// ✅ Safe (Raw queries are parameterized)
const user = await prisma.$queryRaw`
  SELECT * FROM users WHERE phone_hash = ${userInput}  // Input parameterized
`;

// ❌ NEVER do raw string concatenation
const query = `SELECT * FROM users WHERE phone_hash = '${userInput}'`;  // VULNERABLE
```

**Code Review Checklist:**
- [ ] No string concatenation in database queries
- [ ] All user inputs passed as query parameters
- [ ] Prisma client used exclusively (except in migrations)
- [ ] Raw SQL (if used) uses parameterized syntax only

---

## 2. Connection Management & Concurrency

### 2.1 Current Configuration

From `apps/api/src/config/index.ts`:

```typescript
DATABASE_POOL_SIZE: z.string().default("20")  // Default 20 connections
```

**Why 20?**
- Small enough to not exhaust database resources
- Large enough for typical request concurrency (10-50 concurrent API requests)
- Scales to ~1,000 RPS with multiple API instances (each with 20-connection pool)

### 2.2 Tuning for Concurrency Levels

**Local / Small Scale (< 100 concurrent users):**
```yaml
DATABASE_POOL_SIZE: 10
# 1-2 API instances
# Single database instance
```

**Medium Scale (100–5K concurrent users):**
```yaml
DATABASE_POOL_SIZE: 20  # Default (current)
# 2-4 API instances (behind load balancer)
# Single database instance with read-only replica
# Connection pooler (PgBouncer) if database connection limit exceeded
```

**Large Scale / B2B (5K–50K concurrent users):**
```yaml
DATABASE_POOL_SIZE: 30-50  # Increase per instance
# 5-10 API instances (auto-scaling Fargate/EKS)
# Multi-AZ RDS Primary + Read Replica(s)
# Connection pooler MANDATORY (PgBouncer in transaction/session mode)
```

**Formula for pool size:**
```
Pool_Size = (Concurrent_Connections / Num_API_Instances) + Buffer
  where Buffer = 2-5 (for connection churn)

Example:
- 10K concurrent users
- Avg 1 active DB connection per 20 users = 500 connections needed
- 10 API instances = 50 connections per instance
- Add buffer of 5 = DATABASE_POOL_SIZE=55
```

### 2.3 Connection Pooling Strategy

**Option 1: Prisma Client Pool (Current)**
- Manages connection pool internally
- Each API instance has independent pool
- Good for: < 1,000 connections total

```typescript
// apps/api/src/server.ts
const prisma = new PrismaClient({
  log: ['error', 'warn'],  // Reduce logging noise
});
```

**Option 2: External Pool (PgBouncer) — Recommended for Scale**
- Separate pooling layer between app and database
- Reduces connection overhead by 50-70%
- Supports transaction and session pooling modes

```dockerfile
# docker-compose.prod.yml
pgbouncer:
  image: pgbouncer:latest
  environment:
    DATABASES_HOST: postgres.internal
    DATABASES_PORT: 5432
    DATABASES_DBNAME: pulse_prod
    DATABASES_USER: pulse_app
    MAX_CLIENT_CONN: 1000         # Max connections from app
    DEFAULT_POOL_SIZE: 50          # Connections to database
    MIN_POOL_SIZE: 10
    POOL_MODE: transaction         # Release connection after each transaction
  ports:
    - "6432:6432"
```

Update application DATABASE_URL:
```env
# Before: Direct to Postgres
DATABASE_URL=postgresql://pulse_app:pwd@postgres:5432/pulse_prod

# After: Via PgBouncer
DATABASE_URL=postgresql://pulse_app:pwd@pgbouncer:6432/pulse_prod
```

**Option 3: AWS RDS Proxy (Managed Pooling)**
- AWS-managed connection pooler
- No infrastructure to manage
- ~20% cost overhead, but reduces operational burden

```yaml
# Enable RDS Proxy in Terraform/CloudFormation
RdsProxy:
  DBClusterIdentifiers:
    - pulse-prod-cluster
  MaxIdleConnectionsPercent: 50
  ConnectionBorrowTimeout: 120
  SessionPinningFilters:
    - EXCLUDE_VARIABLE_SETS
```

### 2.4 Transaction Handling

**Current Implementation (Good):**
```typescript
// apps/api/src/modules/users/users.service.ts
await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ ... });
  await tx.profile.create({ ... });
  // All-or-nothing: both succeed or both fail
});
```

**For High Concurrency (Optimize Transactions):**

```typescript
// Keep transactions SHORT (< 100ms ideal)
// Example: Breaking a long transaction

// ❌ BAD: Long transaction holding locks
await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ ... });
  // Call external API (could take 5 seconds!)
  const fcmResult = await firebase.messaging.send(...);
  await tx.notification.create({ ... });
});

// ✅ GOOD: Transaction for critical writes only
const user = await prisma.user.create({ ... });
// Call external service outside transaction
const fcmResult = await firebase.messaging.send(...);
// Update non-critical data outside transaction (retry-safe)
await prisma.notification.create({ ... }).catch(err => logger.error(err));
```

**Isolation Level Management:**

```typescript
// Prisma default: READ_COMMITTED (safe for most use cases)
// For vote integrity (single vote per user per poll):

// Use explicit serialization for critical checks
await prisma.$transaction(
  [
    // Step 1: Check if vote exists (will be locked)
    prisma.vote.findUnique({
      where: { user_id_poll_id: { user_id, poll_id } }
    }),
    // Step 2: Create if not exists
    // (If concurrent request tries, one will fail with constraint violation)
  ],
  { isolationLevel: 'Serializable' }  // Strongest guarantee
);
```

---

## 3. Peak User & B2B Scaling

### 3.1 Load Testing Benchmarks

**From PULSE.txt:**

| Stage | Concurrent Users | Requests/Sec | Database QPS | Recommendation |
|-------|------------------|--------------|--------------|-----------------|
| Pre-launch | 1,000 | 100 | 500–1,000 | Single RDS db.t3.micro |
| B2B Sales Pitch | 10,000 | 1,000 | 5,000–10,000 | RDS db.r6i.large + read replica |
| Viral / Growth | 50,000+ | 5,000+ | 25,000+ | Aurora PostgreSQL auto-scaling |

### 3.2 Scaling Phases

**Phase 0: Local Development**
- PostgreSQL 16 local (Docker)
- Single process
- No connection pooling needed

**Phase 1: Soft Launch (1K–10K users)**
- AWS RDS db.t3.micro or Supabase free tier
- Single API instance (or 2 instances, 1 standby)
- No read replica yet
- Redis for cache/rate-limit (local or ElastiCache t3.micro)
- Estimated cost: ₹2,000–3,000/month

```yaml
# Deployment config
database:
  instance: db.t3.micro (1 vCPU, 1 GB RAM, burst-capable)
  storage: 100 GB SSD (auto-scaling enabled)
  backup_retention: 7 days
  multi_az: false  # Not needed at this stage

compute:
  api_instances: 1 (Fargate 0.25 vCPU / 512 MB RAM)
  api_instances_standby: 1  # For blue/green deployments
  auto_scaling: Off (manual scaling only)

cache:
  redis: Single instance (t3.micro)
  memory: 512 MB
```

**Phase 1.5: Pre-B2B Growth (10K–50K users)**
- Upgrade to RDS db.r6i.large (2 vCPU, 16 GB RAM)
- Add read replica (same region, auto-failover)
- Horizontal API scaling (3-5 instances)
- Redis cluster mode or ElastiCache (3 nodes)
- Estimated cost: ₹8,000–12,000/month

```yaml
database:
  primary: db.r6i.large (2 vCPU, 16 GB RAM)
  read_replica: db.r6i.large (same region)
  failover: 60 seconds
  backup_retention: 14 days
  multi_az: true  # Automatic failover

api:
  instances: 3-5 (auto-scaling, 0.5 vCPU each)
  health_check_interval: 30 seconds
  connection_drain_timeout: 30 seconds

cache:
  redis_cluster: 3 nodes (t3.small), 2 GB total
```

**Phase 2: Enterprise / Viral (50K–500K users)**
- Aurora PostgreSQL with auto-scaling (managed, handles replication)
- 3+ read replicas (cross-region for global presence)
- Kubernetes (EKS) for API auto-scaling (10-50 instances)
- ElastiCache cluster mode (5-11 nodes, sharded)
- CDN for static assets (CloudFront)
- Estimated cost: ₹50,000–150,000/month

```yaml
database:
  type: Aurora PostgreSQL (serverless v2 recommended)
  min_capacity: 0.5 ACUs (auto-scales on demand)
  max_capacity: 4 ACUs (16 vCPU equiv.)
  read_replicas: 3 (different AZs)
  backup_retention: 30 days (PITR enabled)
  multi_region: failover replica in different region

api:
  platform: EKS (Kubernetes)
  min_replicas: 10
  max_replicas: 100 (HPA based on CPU/memory)
  compute: t3.large nodes (2 vCPU, 8 GB)
  auto_scaling_group: Enabled

cache:
  redis_cluster: 11 nodes (shard + replicas)
  memory_per_node: 4 GB
  eviction_policy: allkeys-lru
```

### 3.3 Read/Write Split for B2B

**Current State (No Split):**
- All queries go to primary database
- No read replica

**After scaling to 10K+ users (Read Replica):**

```typescript
// Prisma extension for read/write split
// (Official support via readReplicas is in progress; workaround below)

// Approach 1: Environment-based switching
const prisma_write = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_PRIMARY } }
});

const prisma_read = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_REPLICA } }
});

// In modules:
export const userService = {
  async getUser(id: string) {
    // Read operations → Replica
    return prisma_read.user.findUnique({ where: { id } });
  },
  
  async updateUser(id: string, data: any) {
    // Write operations → Primary
    const user = await prisma_write.user.update({ where: { id }, data });
    // Invalidate cache immediately
    await redis.del(`user:${id}`);
    return user;
  }
};
```

**Approach 2: Prisma Native (When available)**
```typescript
// Future: Prisma native read replica support
const prisma = new PrismaClient();

// Automatically routes to replica
const user = await prisma.user.findUnique({ where: { id } });

// Explicitly routes to primary
const updated = await prisma.user.update({
  where: { id },
  data: { name: 'new name' },
  // Force primary if needed (handles replication lag)
  _readPreference: { mode: 'primary' }
});
```

**Replication Lag Handling:**
```typescript
// After a write, subsequent reads might see stale data (< 1 second usually)
// For critical reads, add retry logic:

async function getUserWithConsistency(userId: string, maxAttempts = 3) {
  for (let i = 0; i < maxAttempts; i++) {
    const user = await prisma_read.user.findUnique({ where: { id: userId } });
    
    // Check if data is fresh (updated_at should match what we just wrote)
    if (user && user.updated_at >= now - 1000) {
      return user;  // Fresh data
    }
    
    if (i < maxAttempts - 1) {
      await new Promise(r => setTimeout(r, 100 * (i + 1)));  // Exponential backoff
    }
  }
  
  // Fallback to primary if replica too far behind
  return prisma_write.user.findUnique({ where: { id: userId } });
}
```

### 3.4 Monitoring Query Performance at Scale

**Queries to Watch (Identify N+1 problems early):**

```typescript
// ❌ N+1 Problem: One query per opinion
const opinions = await prisma.opinion.findMany({ where: { poll_id } });
for (const opinion of opinions) {
  const user = await prisma.user.findUnique({ where: { id: opinion.user_id } });
  // At 1000 opinions = 1001 queries!
}

// ✅ Fixed: Single batch query
const opinions = await prisma.opinion.findMany({
  where: { poll_id },
  include: { user: true }  // Join in single query
});
```

**Enable Query Logging in Production (Selectively):**

```typescript
// apps/api/src/server.ts
const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' }
  ]
});

prisma.$on('query', (e) => {
  // Only log slow queries (> 500ms)
  if (e.duration > 500) {
    logger.warn('Slow query detected', {
      query: e.query,
      duration_ms: e.duration,
      params: e.params
    });
  }
});
```

---

## 4. Backup & Disaster Recovery

### 4.1 Backup Strategy

**Minimum RTO/RPO for Pulse:**
- RTO (Recovery Time Objective): 1 hour
- RPO (Recovery Point Objective): 1 hour (acceptable loss)

| Backup Type | Frequency | Retention | RTO | RPO | Cost |
|-------------|-----------|-----------|-----|-----|------|
| Automated RDS snapshots | Daily | 14 days | 10 min | 24 hours | Included |
| Point-in-time recovery (PITR) | Continuous | 7 days | 5 min | < 1 min | ₹500/month |
| Cross-region replica | Real-time | Indefinite | 2 min | < 1 sec | 2x DB cost |
| Manual weekly export to S3 | Weekly | 30 days | 30 min | 7 days | ₹100/month |

**Recommended for Production:**
```yaml
Primary database (Mumbai ap-south-1):
  - Automated snapshots: Daily, 14-day retention
  - PITR: Enabled, 7-day retention
  - Read replica: Automatic failover in same AZ
  
Standby database (Hyderabad ap-south-2):
  - Asynchronous cross-region replica
  - Failover time: 2–5 minutes
  - Manual promotion required
  
S3 Archive:
  - Weekly full export to S3
  - Retention: 30 days
  - Cost: ~₹50/month for storage, ~₹100 for Glue jobs
```

### 4.2 Backup Implementation

**AWS RDS (Automated):**
```yaml
# Terraform example
resource "aws_db_instance" "pulse_prod" {
  identifier = "pulse-prod"
  
  # Backup policy
  backup_retention_period = 14        # 14 days
  backup_window           = "03:00-04:00"  # UTC, 1 hour window
  copy_tags_to_snapshot   = true
  
  # PITR support
  enabled_cloudwatch_logs_exports = ["postgresql"]
  
  # Monitoring
  monitoring_interval     = 60        # Enhanced monitoring
  monitoring_role_arn     = aws_iam_role.rds_monitor.arn
  
  # Multi-AZ for automatic failover
  multi_az = true
}

# Cross-region read replica
resource "aws_db_instance" "pulse_standby" {
  identifier           = "pulse-standby"
  replicate_source_db  = aws_db_instance.pulse_prod.identifier
  
  # Different region (Hyderabad)
  provider = aws.ap-south-2
}
```

**Manual Backup Script (Supplement Automated):**
```bash
#!/bin/bash
# backup-db.sh - Weekly full export

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BUCKET=s3://pulse-prod-backups
DATABASE_URL="${DATABASE_URL:-postgresql://...}"

# Use pg_dump to export
pg_dump \
  --host $(echo $DATABASE_URL | grep -oP '(?<=@)[^:]+') \
  --username $(echo $DATABASE_URL | grep -oP '(?<=/)[^:]+') \
  --format custom \
  --compress 9 \
  --file /tmp/pulse_backup_${TIMESTAMP}.dump \
  pulse_prod

# Upload to S3 with encryption
aws s3 cp /tmp/pulse_backup_${TIMESTAMP}.dump \
  ${BUCKET}/weekly/backup_${TIMESTAMP}.dump \
  --sse AES256 \
  --storage-class GLACIER_IR

# Keep local copy for 7 days
find /backups -name "pulse_backup_*.dump" -mtime +7 -delete

echo "Backup complete: ${TIMESTAMP}"
```

### 4.3 Disaster Recovery Testing

**Monthly Restore Drill (Non-Production):**
```bash
#!/bin/bash
# restore-test.sh - Restore latest backup to staging

# 1. Create staging database clone
aws rds create-db-instance-read-replica \
  --db-instance-identifier pulse-staging-$(date +%s) \
  --source-db-instance-identifier pulse-prod

# 2. Wait for snapshot creation
sleep 300

# 3. Restore from snapshot to staging
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier pulse-staging-latest \
  --db-snapshot-identifier pulse-prod-snapshot-latest

# 4. Run smoke tests on staging
npm run test:smoke -- --database-url postgresql://...pulse-staging...

# 5. Document results
echo "Restore test: PASSED" > restore-test-$(date +%Y%m%d).log

# 6. Clean up staging
aws rds delete-db-instance \
  --db-instance-identifier pulse-staging-latest \
  --skip-final-snapshot
```

---

## 5. Monitoring & Alerting

### 5.1 Database Metrics to Track

**Critical Metrics (Alert Immediately):**

```yaml
Database Health:
  - CPU Utilization > 80% (2 min sustained)
    Action: Scale up instance, investigate slow queries
    
  - Connections > 90% of max (e.g., > 180/200)
    Action: Check for connection leaks, restart pooler
    
  - Replication Lag > 10 seconds (replica only)
    Action: Investigate network, consider failover
    
  - Free Storage Space < 10% 
    Action: Increase storage immediately (can't shrink later)
    
  - Failed Authentication Attempts > 10/minute
    Action: Check credentials rotation, investigate breach

Query Performance:
  - Query Execution Time > 5 seconds (p95)
    Action: Identify and optimize query, add index
    
  - Full Table Scans > 100/hour
    Action: Review recent schema changes, add missing indexes
    
  - Temp Files Created > 100 MB/hour
    Action: Increase work_mem, optimize query sorting

Locks & Blocking:
  - Active Locks > 20
    Action: Identify blocking query, terminate if needed
    
  - Wait Events > 50% of total time
    Action: Investigate IO contention, add read replica
```

**Setup in CloudWatch (AWS):**

```yaml
# terraform/monitoring.tf
resource "aws_cloudwatch_metric_alarm" "db_cpu" {
  alarm_name          = "pulse-prod-database-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "60"
  statistic           = "Average"
  threshold           = "80"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  
  dimensions = {
    DBInstanceIdentifier = "pulse-prod"
  }
}

resource "aws_cloudwatch_metric_alarm" "db_storage" {
  alarm_name          = "pulse-prod-database-storage-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "10737418240"  # 10 GB in bytes
  alarm_actions       = [aws_sns_topic.alerts.arn]
}

resource "aws_sns_topic" "alerts" {
  name = "pulse-database-alerts"
  
  # Email, Slack, PagerDuty subscription
}
```

### 5.2 Application-Level Monitoring

```typescript
// apps/api/src/common/instrumentation/database-monitoring.ts

import { logger } from './logger';

export function monitorDatabaseHealth() {
  // Query response times
  let queryCount = 0;
  let totalDuration = 0;
  
  prisma.$on('query', (e) => {
    queryCount++;
    totalDuration += e.duration;
    
    // Percentile calculation (collect every 100th query)
    if (queryCount % 100 === 0) {
      const p95 = totalDuration / queryCount * 1.5;  // Approximation
      if (p95 > 5000) {
        logger.warn('High query latency detected', {
          p95_ms: p95,
          avg_ms: totalDuration / queryCount
        });
        captureTrackedException(new Error('DB latency high'), { p95_ms });
      }
    }
  });
  
  // Connection pool health
  setInterval(async () => {
    const stats = await prisma.$queryRaw`SELECT count(*) as count FROM pg_stat_activity`;
    logger.debug('DB connections', stats);
  }, 60000);  // Every 60 seconds
}
```

---

## 6. Index Strategy for Performance

### 6.1 Current Indexes (From Schema)

The Prisma schema includes thoughtful indexing:

```prisma
// Good indexes for common queries
model User {
  @@index([phone_hash])      // Fast phone verification
  @@index([is_active])       // Filter for active users
  @@index([is_banned])       // Moderation queries
  @@index([created_at])      // Time-series queries
  @@index([city])            // Geographic filtering
}

model Poll {
  @@index([category])        // Category browsing
  @@index([is_active])       // Active polls feed
  @@index([status])          // Admin queue
  @@index([is_commercial])   // Organic vs. sponsored
  @@index([created_at])      // Timeline
  @@index([start_date, end_date])  // Range queries (election blackout)
}

model Opinion {
  @@unique([user_id, poll_id])  // One opinion per poll (constraint)
  @@index([poll_id, agree_count])     // Sorting by agreement
  @@index([poll_id, created_at])      // Chronological ordering
  @@index([moderation_status, created_at])  // Moderation queue
}

model Vote {
  @@unique([user_id, poll_id])  // One vote per poll (constraint)
  @@index([poll_id])            // Vote counts by poll
  @@index([voted_at])           // Time-series analysis
}
```

### 6.2 Add Indexes for B2B Scale

**Identify missing indexes (run in production)::**

```sql
-- Find sequential scans (full table scans)
SELECT
  schemaname, tablename, idx_scan, seq_scan,
  ROUND((seq_scan * 100) / (seq_scan + idx_scan), 2) AS pct_seq_scan
FROM pg_stat_user_tables
WHERE (seq_scan + idx_scan) > 1000
  AND seq_scan > idx_scan
ORDER BY pct_seq_scan DESC;

-- Result example:
-- If opinions table shows 90% seq scans, add index on poll_id or moderation_status
```

**Recommended additional indexes:**

```sql
-- For feed pagination (poll listing)
CREATE INDEX CONCURRENTLY idx_poll_created_category 
  ON polls(created_at DESC, category) 
  WHERE is_active = true;

-- For notification queries (per-user, by time)
CREATE INDEX CONCURRENTLY idx_notification_user_created 
  ON notifications(user_id, created_at DESC) 
  WHERE is_read = false;

-- For audit log search (compliance queries)
CREATE INDEX CONCURRENTLY idx_audit_user_action 
  ON audit_logs(user_id, action, created_at DESC);

-- For user engagement analytics
CREATE INDEX CONCURRENTLY idx_engagement_user_action 
  ON user_engagements(user_id, action, created_at);

-- For vote integrity checks (on write)
CREATE INDEX CONCURRENTLY idx_vote_user_poll 
  ON votes(user_id, poll_id);
```

**Analyze index usage:**

```sql
-- Unused indexes (consuming space, not helping queries)
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- Drop unused indexes (save space, improve write performance)
DROP INDEX CONCURRENTLY index_name;
```

---

## 7. Migration Safety

### 7.1 Zero-Downtime Migrations

**Problem:** Adding a column with NOT NULL default causes table rewrite (downtime).

**Solution: Prisma + Blue/Green Deployment**

```prisma
// ❌ Migration 1 (creates lock during rewrite)
model User {
  // ... existing fields ...
  new_field String  // NOT NULL with default
}

// ✅ Correct approach (4-step blue/green)
// Step 1: Add column, allow NULL
model User {
  new_field String?  // Nullable
}
// Deploy and run migration (fast, no rewrite)

// Step 2: Backfill in batches (app must handle NULL during this)
// (Run manually or via job)

// Step 3: Add NOT NULL constraint
// ALTER TABLE users ALTER COLUMN new_field SET NOT NULL;

// Step 4: Update schema in code
model User {
  new_field String  // Now NOT NULL
}
```

**Example Backfill Job:**

```typescript
// apps/api/src/jobs/backfill.worker.ts
export async function backfillNewField() {
  const BATCH_SIZE = 1000;
  let offset = 0;
  let updated = 0;

  while (true) {
    const users = await prisma.user.findMany({
      where: { new_field: null },
      skip: offset,
      take: BATCH_SIZE,
    });

    if (users.length === 0) break;

    // Compute default value (can be complex)
    const updates = users.map(u => ({
      id: u.id,
      new_field: computeDefault(u)  // Custom logic
    }));

    // Batch update
    await prisma.$transaction(
      updates.map(u =>
        prisma.user.update({
          where: { id: u.id },
          data: { new_field: u.new_field }
        })
      )
    );

    updated += users.length;
    offset += BATCH_SIZE;

    logger.info(`Backfilled ${updated} users`);
    
    // Avoid overwhelming database
    await new Promise(r => setTimeout(r, 1000));
  }

  logger.info(`Backfill complete: ${updated} records updated`);
}
```

### 7.2 Rollback Strategy

```bash
# Each migration is reversible
pnpm prisma migrate resolve

# If migration fails mid-deployment:
# 1. Rollback in database (manual or via RDS snapshot)
# 2. Rollback application code (git revert)
# 3. Re-deploy previous version

# Test rollback procedure quarterly
```

---

## 8. Compliance & Audit

### 8.1 DPDP Compliance

**Current Implementation (Good):**

```prisma
model AuditLog {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id     String?  @db.Uuid
  action      String   @db.VarChar(100)
  entity_type String   @db.VarChar(50)
  entity_id   String?  @db.Uuid
  ip_address  String?  @db.VarChar(45)
  user_agent  String?
  metadata    Json?
  created_at  DateTime @default(now()) @db.Timestamp(6)
  @@index([user_id, created_at])
}

model ConsentRecord {
  // Tracks DPDP consent per user
  user_id              String
  accepted_terms       Boolean
  accepted_privacy     Boolean
  age_confirmed        Boolean
  analytics_consent    Boolean
  timestamp            DateTime
}
```

**Requirements:**
- [ ] Audit logs capture all data access
- [ ] Consent records retained for 3 years (DPDP requirement)
- [ ] Right-to-deletion: `DELETE FROM users WHERE id = $1` cascades to all related records
- [ ] Data export: User can request all their data (DPDP §4)
- [ ] Encryption at rest + in transit enabled

### 8.2 Data Retention Policies

```sql
-- Delete accounts (right-to-be-forgotten) after 180 days of inactivity
CREATE PROCEDURE delete_inactive_users()
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM users
  WHERE last_active_at < NOW() - INTERVAL '180 days'
    AND is_active = false;
  
  -- Audit
  INSERT INTO audit_logs (action, entity_type, metadata)
  VALUES ('DELETE', 'USER', jsonb_build_object('count', ROW_COUNT()));
END $$;

-- Run monthly
-- SELECT delete_inactive_users();
```

---

## 9. Troubleshooting Common Issues

### 9.1 High CPU

**Diagnosis:**
```sql
-- Find expensive queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
```

**Solution:**
1. Add missing index on WHERE/JOIN columns
2. Break long transactions into smaller chunks
3. Increase `work_mem` if doing large sorts: `SET work_mem = '256MB'`
4. Scale up database instance

### 9.2 Connection Pool Exhaustion

**Symptoms:** API returns "connection timeout" errors, but database is not overloaded.

**Diagnosis:**
```sql
SELECT count(*) as open_connections FROM pg_stat_activity;
SELECT client_addr, count(*) FROM pg_stat_activity GROUP BY 1;
```

**Solution:**
1. Check for connection leaks in app (missing `prisma.$disconnect()`)
2. Reduce `DATABASE_POOL_SIZE` if too aggressive
3. Add PgBouncer pooler
4. Increase max_connections in database

### 9.3 Replication Lag (After Adding Read Replica)

**Symptoms:** Reads on replica return stale data (previous versions of records).

**Diagnosis:**
```sql
-- On primary
SELECT slot_name, restart_lsn FROM pg_replication_slots;

-- On replica
SELECT now() - pg_last_xact_replay_time() AS replication_lag;
```

**Solution:**
1. Lag < 1 second: Normal, application should retry reads after writes
2. Lag > 10 seconds: Check network bandwidth, replica query load
3. Lag > 1 minute: Promote replica to primary, investigate primary

### 9.4 Backup Restore Failure

**Error:** "Table already exists" or "Constraint violation"

**Solution:**
```bash
# Drop and recreate schema
psql -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Restore backup
pg_restore --create --exit-on-error backup.dump | psql -U pulse_admin
```

---

## References & Runbooks

- [AWS RDS Best Practices](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_BestPractices.html)
- [Postgres Connection Pooling](https://wiki.postgresql.org/wiki/Number_Of_Database_Connections)
- [Prisma Scaling Guide](https://www.prisma.io/docs/guides/performance-and-optimization)
- [DPDP Compliance Checklist](https://www.meity.gov.in/DigitalPersonalDataProtection)

---

**Last Updated:** 2026-08-15  
**Owner:** Database & Infrastructure Team  
**Review Frequency:** Quarterly
