import { PrismaClient } from "@prisma/client";
import { logger } from "../../common/interceptors/logger";
import { redis } from "../../config/redis";
import { notificationsService } from "../notifications/notifications.service";
import { badgesService } from "../badges/badges.service";
import { io } from "../../gateway/socket";
import type { VoteInput, GuestVoteInput } from "./votes.types";

const prisma = new PrismaClient();

export class VotesService {
  async vote(userId: string, pollId: string, input: VoteInput) {
    // 1. REDIS CACHE: Offload read traffic from the main database
    const cacheKey = `poll_cache:${pollId}`;
    let pollStr = await redis.get(cacheKey);
    let poll;

    if (pollStr) {
      poll = JSON.parse(pollStr);
    } else {
      poll = await prisma.poll.findUnique({
        where: { id: pollId },
        select: { id: true, is_active: true, status: true, options: true, question: true },
      });
      if (poll) {
        await redis.setex(cacheKey, 60, JSON.stringify(poll));
      }
    }

    if (!poll || !poll.is_active || poll.status !== "ACTIVE") {
      const error: any = new Error("Poll is not active");
      error.status = 403;
      throw error;
    }

    if (input.option_index >= poll.options.length) {
      const error: any = new Error("Invalid option index");
      error.status = 400;
      throw error;
    }

    let createdVote;

    // 2. ATOMIC WRITE: Prevents race conditions using DB-level constraints
    try {
      const [vote] = await prisma.$transaction([
        prisma.vote.create({
          data: {
            user_id: userId,
            poll_id: pollId,
            option_index: input.option_index,
          },
        }),
        prisma.userPollAssignment.updateMany({
          where: { user_id: userId, poll_id: pollId },
          data: { is_voted: true },
        })
      ]);
      createdVote = vote;
    } catch (error: any) {
      if (error.code === "P2002") {
        throw new Error("You have already voted on this poll");
      }
      throw error;
    }

    // 3. FIRE AND FORGET WITH REDIS LOCK
    Promise.resolve().then(async () => {
      try {
        // Fast, individual tasks run immediately
        await Promise.allSettled([
          prisma.userEngagement.create({
            data: { user_id: userId, poll_id: pollId, action: "VOTE" },
          }),
          this.updateVoteStreak(userId),
          input.reason ? redis.setex(`vote_reason:${userId}:${pollId}`, 86400 * 30, input.reason) : Promise.resolve(),
        ]);

        // REDIS SHIELD: 2-Second Lock to prevent database CPU exhaustion
        const lockKey = `lock:poll_update:${pollId}`;
        const acquired = await redis.set(lockKey, "1", "EX", 2, "NX");

        // Only ONE concurrent thread per 2 seconds is allowed to do the heavy math
        if (acquired === "OK") {
          const pollVoteCount = await prisma.vote.count({ where: { poll_id: pollId } });
          
          if ([25, 50, 100].includes(pollVoteCount)) {
            await notificationsService.createNotification(userId, "POLL_TRENDING", "Your vote is part of a rising poll", `Your vote on "${poll.question}" helped this poll reach ${pollVoteCount} votes.`, {
              poll_id: pollId,
              vote_count: pollVoteCount,
            });
          }

          await badgesService.evaluateBadges(userId);

          if (io) {
            const voteCounts = await prisma.vote.groupBy({
              by: ["option_index"],
              where: { poll_id: pollId },
              _count: { option_index: true },
            });

            const totalOpinions = await prisma.opinion.count({ where: { poll_id: pollId } });
            const optionsArray = Array.isArray(poll.options) ? poll.options : [];
            
            const results = optionsArray.map((optionText: any, index: number) => {
              const countRecord = voteCounts.find((v) => v.option_index === index);
              const count = countRecord ? countRecord._count.option_index : 0;
              const percentage = pollVoteCount > 0 ? Math.round((count / pollVoteCount) * 100) : 0;
              return { option: String(optionText), index, count, percentage };
            });

            const liveUpdate = {
              pollId,
              totalVotes: pollVoteCount,
              results,
              totalOpinions,
              velocity: 15,
              isLive: true,
            };

            // Broadcast batched updates safely
            io.to(`poll_${pollId}`).emit("poll_updated", liveUpdate);
            io.emit("new_activity", {
              id: createdVote.id,
              type: "vote",
              message: `A new vote was just cast on "${poll.question.substring(0, 30)}..."`,
              timestamp: new Date(),
              pollId,
            });
          }
        }
        
      } catch (backgroundError) {
        logger.error("Background processing failed after successful vote", backgroundError);
      }
    });

    // 4. INSTANT RETURN
    return {
      ...createdVote,
      user_vote_index: input.option_index,
    };
  }

  async getUserStreak(userId: string) {
    const votes = await prisma.vote.findMany({
      where: { user_id: userId },
      orderBy: { voted_at: "desc" },
      select: { voted_at: true },
    });

    if (votes.length === 0) {
      return { current_streak: 0, last_vote_date: null };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;
    let current = new Date(today);

    for (const vote of votes) {
      const voteDate = new Date(vote.voted_at);
      voteDate.setHours(0, 0, 0, 0);
      const diffDays = Math.round((current.getTime() - voteDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) {
        streak += 1;
        current = voteDate;
        break;
      }
      if (diffDays === 1) {
        streak += 1;
        current = voteDate;
        break;
      }
      if (diffDays > 1) {
        break;
      }
    }

    return {
      current_streak: streak,
      last_vote_date: votes[0].voted_at,
    };
  }

  async getWeeklySummary(userId: string) {
    const start = new Date();
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);

    const [votes, opinions, reactions] = await Promise.all([
      prisma.vote.count({ where: { user_id: userId, voted_at: { gte: start } } }),
      prisma.opinion.count({ where: { user_id: userId, created_at: { gte: start } } }),
      prisma.opinionReaction.findMany({
        where: { user: { id: userId } },
        include: { opinion: true },
      }),
    ]);

    const agreeCount = reactions.filter((reaction) => reaction.reaction_type === "AGREE" && reaction.opinion?.created_at && reaction.opinion.created_at >= start).length;

    return {
      polls_voted: votes,
      opinions_shared: opinions,
      total_agrees_received: agreeCount,
      period_start: start.toISOString(),
    };
  }

  async getCohortComparison(userId: string, pollId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    const userVote = await prisma.vote.findUnique({
      where: { user_id_poll_id: { user_id: userId, poll_id: pollId } },
    });

    if (!userVote) {
      throw new Error("You must vote to see cohort comparison");
    }

    const profileWhere: any = {};
    if (user?.profile?.age_bracket) {
      profileWhere.age_bracket = user.profile.age_bracket;
    }
    if (user?.profile?.gender) {
      profileWhere.gender = user.profile.gender;
    }

    const cohortWhere: any = {
      poll_id: pollId,
      user: {
        city: user?.city || undefined,
        profile: Object.keys(profileWhere).length > 0 ? profileWhere : undefined,
      },
    };

    if (!cohortWhere.user.city) delete cohortWhere.user.city;
    if (!cohortWhere.user.profile) delete cohortWhere.user.profile;

    const cohortVotes = await prisma.vote.groupBy({
      by: ["option_index"],
      where: cohortWhere,
      _count: { option_index: true },
    });

    const totalCohortVotes = cohortVotes.reduce((sum, v) => sum + v._count.option_index, 0);

    return {
      user_vote_index: userVote.option_index,
      cohort_total_votes: totalCohortVotes,
      cohort_breakdown: cohortVotes.map((v) => ({
        option_index: v.option_index,
        count: v._count.option_index,
        percentage: totalCohortVotes > 0 ? Math.round((v._count.option_index / totalCohortVotes) * 100) : 0,
      })),
      is_majority: totalCohortVotes > 0
        ? cohortVotes.some((v) => v.option_index === userVote.option_index && v._count.option_index === Math.max(...cohortVotes.map((c) => c._count.option_index)))
        : null,
    };
  }

  async guestVote(pollId: string, input: GuestVoteInput, ip?: string) {
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      select: { is_active: true, status: true, options: true, question: true },
    });

    if (!poll || !poll.is_active || poll.status !== "ACTIVE") {
      const error: any = new Error("Poll is not active");
      error.status = 403;
      throw error;
    }

    if (input.option_index >= poll.options.length) {
      const error: any = new Error("Invalid option index");
      error.status = 400;
      throw error;
    }

    const ipHash = ip ? require("crypto").createHash("sha256").update(ip).digest("hex") : null;

    const guestVote = await prisma.guestVote.create({
      data: {
        session_id: input.session_id,
        poll_id: pollId,
        option_index: input.option_index,
        ip_hash: ipHash,
      },
    });

    // 1. Bust the immediate poll cache
    await redis.del(`poll_cache:${pollId}`);
    // 2. Safely bust global feed caches so the REST API recalculates
    redis.keys('*feed*').then(keys => keys.length && redis.del(keys)).catch(() => {});

    // 3. Fire WebSocket broadcast to update UI instantly
    Promise.resolve().then(async () => {
      try {
        const [voteCount, guestCount] = await Promise.all([
          prisma.vote.count({ where: { poll_id: pollId } }),
          prisma.guestVote.count({ where: { poll_id: pollId } })
        ]);
        const pollVoteCount = voteCount + guestCount;

        if (io) {
          const [voteCounts, guestCounts] = await Promise.all([
            prisma.vote.groupBy({ by: ["option_index"], where: { poll_id: pollId }, _count: { option_index: true } }),
            prisma.guestVote.groupBy({ by: ["option_index"], where: { poll_id: pollId }, _count: { option_index: true } })
          ]);

          const totalOpinions = await prisma.opinion.count({ where: { poll_id: pollId } });
          const optionsArray = Array.isArray(poll.options) ? poll.options : [];

          const results = optionsArray.map((optionText: any, index: number) => {
            const vc = voteCounts.find((v) => v.option_index === index)?._count.option_index || 0;
            const gc = guestCounts.find((v) => v.option_index === index)?._count.option_index || 0;
            const count = vc + gc;
            const percentage = pollVoteCount > 0 ? Math.round((count / pollVoteCount) * 100) : 0;
            return { option: String(optionText), index, count, percentage };
          });

          io.to(`poll_${pollId}`).emit("poll_updated", {
            pollId,
            totalVotes: pollVoteCount,
            results,
            totalOpinions,
            velocity: 15,
            isLive: true,
          });
        }
      } catch (e) {
        logger.error("Guest socket failed", e);
      }
    });

    return guestVote;
  }

  async transferGuestVotes(sessionId: string, userId: string) {
    const guestVotes = await prisma.guestVote.findMany({
      where: { session_id: sessionId, converted_user_id: null },
    });

    for (const gv of guestVotes) {
      const existing = await prisma.vote.findUnique({
        where: { user_id_poll_id: { user_id: userId, poll_id: gv.poll_id } },
      });

      if (!existing) {
        await prisma.vote.create({
          data: {
            user_id: userId,
            poll_id: gv.poll_id,
            option_index: gv.option_index,
          },
        });
      }

      await prisma.guestVote.update({
        where: { id: gv.id },
        data: { converted_user_id: userId, converted_at: new Date() },
      });
    }

    return { transferred: guestVotes.length };
  }

  private async updateVoteStreak(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const streak = await prisma.voteStreak.findUnique({
      where: { user_id: userId },
    });

    if (!streak) {
      await prisma.voteStreak.create({
        data: { user_id: userId, current_streak: 1, last_vote_date: today },
      });
      return;
    }

    const lastVote = streak.last_vote_date;
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let newStreak = streak.current_streak;
    let recoveryUsed = streak.recovery_used;

    if (lastVote && lastVote.getTime() === today.getTime()) {
      return;
    } else if (lastVote && lastVote.getTime() === yesterday.getTime()) {
      newStreak += 1;
    } else if (lastVote && lastVote.getTime() < yesterday.getTime()) {
      if (!streak.recovery_used) {
        newStreak = 1;
        recoveryUsed = true;
      } else {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }

    await prisma.voteStreak.update({
      where: { user_id: userId },
      data: {
        current_streak: newStreak,
        longest_streak: Math.max(newStreak, streak.longest_streak),
        last_vote_date: today,
        recovery_used: recoveryUsed,
      },
    });

    if (newStreak >= 7) {
      await this.awardBadgeIfNotExists(userId, "CONSISTENT_VOICE");
    }
    if (newStreak >= 30) {
      await this.awardBadgeIfNotExists(userId, "POLLBOOTH_PATRIOT");
    }
  }

  private async awardBadgeIfNotExists(userId: string, badgeCode: string) {
    const badge = await prisma.badge.findUnique({ where: { code: badgeCode } });
    if (!badge) return;

    const existing = await prisma.userBadge.findFirst({
      where: { user_id: userId, badge_id: badge.id },
    });

    if (!existing) {
      await prisma.userBadge.create({
        data: { user_id: userId, badge_id: badge.id },
      });
    }
  }
}

export const votesService = new VotesService();
