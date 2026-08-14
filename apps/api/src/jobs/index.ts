import cron from "node-cron";
import { logger } from "../common/interceptors/logger";
import { registerDigestWorker, enqueueDigestJob } from "./digest.worker";
import { registerModerationWorker, enqueueModerationSweep } from "./moderation.worker";
import { registerNotificationWorker, enqueueNotificationBatch } from "./notification.worker";
import { registerCleanupWorker, enqueueCleanupJob } from "./cleanup.worker";

export async function startWorkers(): Promise<void> {
  try {
    await Promise.all([
      registerDigestWorker(),
      registerModerationWorker(),
      registerNotificationWorker(),
      registerCleanupWorker(),
    ]);

    cron.schedule("30 0 * * *", async () => {
      await enqueueDigestJob();
    });

    cron.schedule("*/15 * * * *", async () => {
      await enqueueModerationSweep();
    });

    // The hourly dummy notification spam has been permanently removed.
    // Notifications will now only trigger via actual user events (e.g., opinion reactions, moderation).

    cron.schedule("0 2 * * 0", async () => {
      await enqueueCleanupJob();
    });

    await enqueueDigestJob();
    await enqueueModerationSweep();
    await enqueueCleanupJob();

    logger.info("Background workers registered and scheduled.");
  } catch (error) {
    logger.error("Background workers failed to start", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}