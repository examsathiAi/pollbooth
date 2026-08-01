import { PrismaClient } from "@prisma/client";
import { Queue, Worker, type Job } from "bullmq";
import { logger } from "../common/interceptors/logger";
import { redis } from "../config/redis";

const prisma = new PrismaClient();

export const digestQueue = new Queue("digest", {
  connection: redis as any,
});

let digestWorker: Worker | null = null;

export async function enqueueDigestJob(date?: Date) {
  const runDate = date ?? new Date();
  await digestQueue.add(
    "daily-digest",
    { date: runDate.toISOString() },
    {
      removeOnComplete: { age: 3600 },
      removeOnFail: { age: 86400 },
    }
  );
}

export async function runDigestWorker(job?: Job<{ date?: string }>) {
  const targetDate = job?.data?.date ? new Date(job.data.date) : new Date();
  const start = new Date(targetDate);
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  const dateKey = start.toISOString().slice(0, 10);

  const votes = await prisma.vote.findMany({
    where: {
      voted_at: {
        gte: start,
        lt: end,
      },
    },
    select: { poll_id: true },
  });

  const voteCounts = new Map<string, number>();
  for (const vote of votes) {
    voteCounts.set(vote.poll_id, (voteCounts.get(vote.poll_id) || 0) + 1);
  }

  const pollIds = Array.from(voteCounts.keys());
  const polls = pollIds.length
    ? await prisma.poll.findMany({
        where: { id: { in: pollIds } },
        select: { id: true, question: true, category: true, options: true },
      })
    : [];

  const topPolls = polls
    .map((poll: { id: string; question: string; category: string; options: string[] }) => ({
      id: poll.id,
      question: poll.question,
      category: poll.category,
      options: poll.options,
      vote_count: voteCounts.get(poll.id) || 0,
    }))
    .sort((a: { vote_count: number }, b: { vote_count: number }) => b.vote_count - a.vote_count)
    .slice(0, 5);

  const opinions = await prisma.opinion.findMany({
    where: {
      created_at: {
        gte: start,
        lt: end,
      },
    },
    select: {
      agree_count: true,
      disagree_count: true,
    },
  });

  const totalAgree = opinions.reduce((sum: number, opinion: { agree_count: number }) => sum + opinion.agree_count, 0);
  const totalDisagree = opinions.reduce((sum: number, opinion: { disagree_count: number }) => sum + opinion.disagree_count, 0);
  const totalOpinions = opinions.length;
  const averageAgreement = totalOpinions > 0 ? totalAgree / totalOpinions : 0;
  const averageDisagreement = totalOpinions > 0 ? totalDisagree / totalOpinions : 0;

  const content = {
    generated_at: new Date().toISOString(),
    date: dateKey,
    top_polls: topPolls,
    sentiment: {
      total_opinions: totalOpinions,
      total_agree: totalAgree,
      total_disagree: totalDisagree,
      average_agreement: Number(averageAgreement.toFixed(2)),
      average_disagreement: Number(averageDisagreement.toFixed(2)),
      net_sentiment: Number((averageAgreement - averageDisagreement).toFixed(2)),
    },
  };

  const digest = await prisma.dailyDigest.upsert({
    where: { date: new Date(`${dateKey}T00:00:00.000Z`) },
    update: {
      title: `Pulse digest for ${dateKey}`,
      content,
      is_published: true,
      published_at: new Date(),
    },
    create: {
      date: new Date(`${dateKey}T00:00:00.000Z`),
      title: `Pulse digest for ${dateKey}`,
      content,
      is_published: true,
      published_at: new Date(),
    },
  });

  logger.info("Daily digest generated", {
    digestId: digest.id,
    date: dateKey,
    pollCount: topPolls.length,
    opinionCount: totalOpinions,
  });

  return digest;
}

export async function registerDigestWorker() {
  if (digestWorker) {
    return digestWorker;
  }

  digestWorker = new Worker(
    "digest",
    async (job) => runDigestWorker(job),
    {
      connection: redis as any,
      concurrency: 1,
    }
  );

  digestWorker.on("completed", (job) => {
    logger.info("Digest worker completed", { jobId: job.id, queue: "digest" });
  });

  digestWorker.on("failed", (job, err) => {
    logger.error("Digest worker failed", {
      jobId: job?.id,
      queue: "digest",
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
  });

  return digestWorker;
}
