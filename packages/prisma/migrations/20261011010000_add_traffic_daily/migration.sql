-- Anonymous daily counters: shown, visits from shares, votes and sign-ins by source
CREATE TABLE IF NOT EXISTS "traffic_daily" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "day" DATE NOT NULL,
    "poll_key" VARCHAR(40) NOT NULL DEFAULT '',
    "kind" VARCHAR(20) NOT NULL,
    "src" VARCHAR(30) NOT NULL DEFAULT 'direct',
    "card" VARCHAR(30) NOT NULL DEFAULT '',
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "traffic_daily_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "traffic_daily_day_poll_key_kind_src_card_key" ON "traffic_daily"("day", "poll_key", "kind", "src", "card");
CREATE INDEX IF NOT EXISTS "traffic_daily_kind_day_idx" ON "traffic_daily"("kind", "day");
