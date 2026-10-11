-- Grievances and data-rights requests (IT Rules 2021, DPDP Act)
CREATE TABLE IF NOT EXISTS "grievances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticket_no" SERIAL NOT NULL,
    "kind" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "contact" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "user_id" UUID,
    "status" VARCHAR(20) NOT NULL DEFAULT 'NEW',
    "due_at" TIMESTAMP(6) NOT NULL,
    "acknowledged_at" TIMESTAMP(6),
    "resolution" TEXT,
    "resolved_by" UUID,
    "resolved_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grievances_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "grievances_ticket_no_key" ON "grievances"("ticket_no");
CREATE INDEX IF NOT EXISTS "grievances_status_due_at_idx" ON "grievances"("status", "due_at");
