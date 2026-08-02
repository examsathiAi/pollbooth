import { PrismaClient } from "@prisma/client";
import { Queue, Worker, type Job } from "bullmq";
import { logger } from "../common/interceptors/logger";
import { redis } from "../config/redis";

const prisma = new PrismaClient();
const cleanupRedisConnection = { ...(redis as Record<string, unknown>), maxRetriesPerRequest: null };

export const cleanupQueue = new Queue("cleanup", {
  connection: cleanupRedisConnection as any,
});

let cleanupWorker: Worker | null = null;

export async function enqueueCleanupJob() {
  await cleanupQueue.add(
    "cleanup-retention",
    {},
    {
      removeOnComplete: { age: 3600 },
      removeOnFail: { age: 86400 },
    }
  );
}

export async function runCleanupWorker(job?: Job) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const softDeletedUsers = await prisma.user.findMany({
    where: {
      AND: [{ deleted_at: { not: null } }, { deleted_at: { lt: ninetyDaysAgo } }],
    },
    select: { id: true },
  });

  for (const user of softDeletedUsers) {
    await prisma.user.delete({ where: { id: user.id } });
  }

  const guestVotesToDelete = await prisma.guestVote.findMany({
    where: {
      voted_at: { lt: thirtyDaysAgo },
      converted_user_id: null,
    },
    select: { id: true },
  });

  if (guestVotesToDelete.length > 0) {
    const ids = guestVotesToDelete.map((vote: { id: string }) => vote.id);
    await prisma.guestVote.deleteMany({
      where: {
        id: { in: ids },
      },
    });
  }

  logger.info("Cleanup worker completed", {
    purgedUserCount: softDeletedUsers.length,
    expiredGuestVoteCount: guestVotesToDelete.length,
  });

  return {
    purgedUserCount: softDeletedUsers.length,
    expiredGuestVoteCount: guestVotesToDelete.length,
  };
}

export async function registerCleanupWorker() {
  if (cleanupWorker) {
    return cleanupWorker;
  }

  cleanupWorker = new Worker(
    "cleanup",
    async (job) => runCleanupWorker(job),
    {
      connection: cleanupRedisConnection as any,
      concurrency: 1,
    }
  );

  cleanupWorker.on("completed", (job) => {
    logger.info("Cleanup worker completed", { jobId: job.id, queue: "cleanup" });
  });

  cleanupWorker.on("failed", (job, err) => {
    logger.error("Cleanup worker failed", {
      jobId: job?.id,
      queue: "cleanup",
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
  });

  return cleanupWorker;
}
