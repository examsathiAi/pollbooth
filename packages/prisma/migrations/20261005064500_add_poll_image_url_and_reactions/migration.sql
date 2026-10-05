-- Catch-up migration: these objects were added to production by hand.
-- Written to be safe whether or not they already exist.

-- AlterTable
ALTER TABLE "polls" ADD COLUMN IF NOT EXISTS "image_url" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "PollReaction" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "poll_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "emoji" VARCHAR(10) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PollReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PollReaction_poll_id_user_id_emoji_key" ON "PollReaction"("poll_id", "user_id", "emoji");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PollReaction_poll_id_fkey') THEN
    ALTER TABLE "PollReaction" ADD CONSTRAINT "PollReaction_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PollReaction_user_id_fkey') THEN
    ALTER TABLE "PollReaction" ADD CONSTRAINT "PollReaction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
