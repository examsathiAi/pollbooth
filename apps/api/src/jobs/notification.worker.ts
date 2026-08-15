import { Prisma, PrismaClient } from "@prisma/client";
import { Queue, Worker, type Job } from "bullmq";
import { logger } from "../common/interceptors/logger";
import { redis } from "../config/redis";
import { config } from "../config";

const prisma = new PrismaClient();
const notificationRedisConnection = { ...(redis as unknown as Record<string, unknown>), maxRetriesPerRequest: null };

export const notificationQueue = new Queue("notification", {
  connection: notificationRedisConnection as any,
});

let notificationWorker: Worker | null = null;

export async function enqueueNotificationBatch(type: string, title: string, body: string, data?: Record<string, unknown>) {
  await notificationQueue.add(
    "batch-push",
    { type, title, body, data },
    {
      removeOnComplete: { age: 3600 },
      removeOnFail: { age: 86400 },
    }
  );
}

export async function runNotificationWorker(job?: Job<{ type?: string; title?: string; body?: string; data?: Record<string, unknown> }>) {
  const payload = job?.data ?? {};
  const recipients = await prisma.user.findMany({
    where: { is_active: true, is_banned: false, deleted_at: null },
    select: { id: true },
  });

  const createdNotifications = [] as Array<{ id: string }>;
  for (const recipient of recipients) {
    const notification = await prisma.notification.create({
      data: {
        user_id: recipient.id,
        type: payload.type ?? "PUSH",
        title: payload.title ?? "PollBooth update",
        body: payload.body ?? "You have a new update from PollBooth.",
        data: (payload.data ?? {}) as Prisma.InputJsonValue,
        sent_at: new Date(),
      },
    });
    createdNotifications.push({ id: notification.id });
  }

  if (config.firebaseProjectId && config.firebasePrivateKey && config.firebaseClientEmail) {
    logger.info("FCM delivery enabled", {
      recipientCount: createdNotifications.length,
      projectId: config.firebaseProjectId,
    });
  } else {
    logger.info("FCM delivery skipped; Firebase credentials not configured", {
      recipientCount: createdNotifications.length,
    });
  }

  return { delivered: createdNotifications.length };
}

export async function registerNotificationWorker() {
  if (notificationWorker) {
    return notificationWorker;
  }

  notificationWorker = new Worker(
    "notification",
    async (job) => runNotificationWorker(job),
    {
      connection: notificationRedisConnection as any,
      concurrency: 1,
    }
  );

  notificationWorker.on("completed", (job) => {
    logger.info("Notification worker completed", { jobId: job.id, queue: "notification" });
  });

  notificationWorker.on("failed", (job, err) => {
    logger.error("Notification worker failed", {
      jobId: job?.id,
      queue: "notification",
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
  });

  return notificationWorker;
}
