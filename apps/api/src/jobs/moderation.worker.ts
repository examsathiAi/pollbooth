import { PrismaClient } from "@prisma/client";
import { Queue, Worker, type Job } from "bullmq";
import { logger } from "../common/interceptors/logger";
import { redis } from "../config/redis";
import { config } from "../config";

const prisma = new PrismaClient();
const moderationRedisConnection = { ...(redis as Record<string, unknown>), maxRetriesPerRequest: null };

export const moderationQueue = new Queue("moderation", {
  connection: moderationRedisConnection as any,
});

let moderationWorker: Worker | null = null;

export async function enqueueModerationSweep() {
  await moderationQueue.add(
    "moderation-sweep",
    {},
    {
      removeOnComplete: { age: 3600 },
      removeOnFail: { age: 86400 },
    }
  );
}

export async function runModerationWorker(job?: Job) {
  const now = new Date();
  const slaThreshold = new Date(now.getTime() - (config.moderationSlaHours || 24) * 60 * 60 * 1000);

  const flaggedOpinions = await prisma.opinion.findMany({
    where: {
      moderation_status: "FLAGGED",
      is_hidden: true,
      created_at: { lt: slaThreshold },
    },
    select: { id: true, user_id: true, created_at: true },
  });

  for (const opinion of flaggedOpinions) {
    await prisma.opinion.update({
      where: { id: opinion.id },
      data: { moderation_status: "REJECTED", is_hidden: true },
    });

    await prisma.moderationAction.create({
      data: {
        user_id: opinion.user_id,
        opinion_id: opinion.id,
        action_type: "AUTO_REJECT",
        reason: "Flagged content exceeded moderation SLA",
        triggered_by: "SYSTEM",
      },
    });
  }

  const pendingQueue = await prisma.opinion.findMany({
    where: {
      moderation_status: "PENDING",
      is_hidden: false,
      created_at: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
    },
    select: { id: true, user_id: true },
  });

  for (const opinion of pendingQueue) {
    await prisma.opinion.update({
      where: { id: opinion.id },
      data: { moderation_status: "FLAGGED", is_hidden: true },
    });
    await prisma.report.create({
      data: {
        opinion_id: opinion.id,
        reporter_id: opinion.user_id,
        reason: "Pending queue cleanup",
        status: "PENDING",
      },
    });
  }

  const recentModActions = await prisma.moderationAction.count({
    where: {
      created_at: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      action_type: { in: ["AUTO_REJECT", "WARN_USER", "REJECT", "KEYWORD_FILTER"] },
    },
  });

  if (recentModActions >= (config.moderationAlertThreshold || 50)) {
    logger.warn("Moderation SLA alert threshold reached", {
      threshold: config.moderationAlertThreshold,
      recentActionCount: recentModActions,
    });
  }

  logger.info("Moderation worker completed", {
    flaggedCount: flaggedOpinions.length,
    pendingQueueCount: pendingQueue.length,
    recentActionCount: recentModActions,
  });

  return { flaggedCount: flaggedOpinions.length, pendingQueueCount: pendingQueue.length };
}

export async function registerModerationWorker() {
  if (moderationWorker) {
    return moderationWorker;
  }

  moderationWorker = new Worker(
    "moderation",
    async (job) => runModerationWorker(job),
    {
      connection: moderationRedisConnection as any,
      concurrency: 1,
    }
  );

  moderationWorker.on("completed", (job) => {
    logger.info("Moderation worker completed", { jobId: job.id, queue: "moderation" });
  });

  moderationWorker.on("failed", (job, err) => {
    logger.error("Moderation worker failed", {
      jobId: job?.id,
      queue: "moderation",
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
  });

  return moderationWorker;
}
