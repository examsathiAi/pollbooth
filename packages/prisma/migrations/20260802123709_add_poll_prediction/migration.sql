-- CreateTable
CREATE TABLE "poll_predictions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "poll_id" UUID NOT NULL,
    "predicted_percentage" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "poll_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "poll_predictions_poll_id_idx" ON "poll_predictions"("poll_id");

-- CreateIndex
CREATE INDEX "poll_predictions_user_id_idx" ON "poll_predictions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "poll_predictions_user_id_poll_id_key" ON "poll_predictions"("user_id", "poll_id");

-- AddForeignKey
ALTER TABLE "poll_predictions" ADD CONSTRAINT "poll_predictions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_predictions" ADD CONSTRAINT "poll_predictions_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
