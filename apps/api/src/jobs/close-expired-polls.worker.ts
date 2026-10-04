import { PrismaClient } from "@prisma/client";
import { Queue, Worker, type Job } from "bullmq";
import { logger } from "../common/interceptors/logger";
import { config } from "../config";
import { notificationsService } from "../modules/notifications/notifications.service";

const prisma = new PrismaClient();
const closeExpiredPollsRedisConnection = { url: config.redisUrl, maxRetriesPerRequest: null };

export const closeExpiredPollsQueue = new Queue("close-expired-polls", {
  connection: closeExpiredPollsRedisConnection as any,
});

let closeExpiredPollsWorker: Worker | null = null;

export async function enqueueCloseExpiredPollsJob() {
  await closeExpiredPollsQueue.add(
    "close-expired-polls",
    {},
    {
      removeOnComplete: { age: 3600 },
      removeOnFail: { age: 86400 },
    }
  );
}

export async function runCloseExpiredPollsWorker(_job?: Job) {
  const now = new Date();

  // 1. Find polls that are about to close to get their IDs
  const pollsToClose = await prisma.poll.findMany({
    where: { status: "ACTIVE", end_date: { not: null, lt: now } },
    select: { id: true }
  });

  if (pollsToClose.length === 0) return { closedPollCount: 0 };

  // 2. Close them
  const result = await prisma.poll.updateMany({
    where: { id: { in: pollsToClose.map(p => p.id) } },
    data: { status: "CLOSED" },
  });

  // 3. Trigger notifications for each closed poll
  for (const poll of pollsToClose) {
    try {
      await notificationsService.notifyPollClosed(poll.id);
    } catch (err) {
      logger.error(`Failed to notify for closed poll ${poll.id}`);
    }
  }

  logger.info("Close-expired-polls worker completed", {
    closedPollCount: result.count,
  });

  return { closedPollCount: result.count };
}

export async function registerCloseExpiredPollsWorker() {
  if (closeExpiredPollsWorker) {
    return closeExpiredPollsWorker;
  }

  closeExpiredPollsWorker = new Worker(
    "close-expired-polls",
    async (job) => runCloseExpiredPollsWorker(job),
    {
      connection: closeExpiredPollsRedisConnection as any,
      concurrency: 1,
    }
  );

  closeExpiredPollsWorker.on("completed", (job) => {
    logger.info("Close-expired-polls worker completed", { jobId: job.id, queue: "close-expired-polls" });
  });

  closeExpiredPollsWorker.on("failed", (job, err) => {
    logger.error("Close-expired-polls worker failed", {
      jobId: job?.id,
      queue: "close-expired-polls",
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
  });

  return closeExpiredPollsWorker;
}
