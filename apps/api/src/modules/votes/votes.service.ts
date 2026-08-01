import { PrismaClient } from "@prisma/client";
import { logger } from "../../common/interceptors/logger";
import { redis } from "../../config/redis";
import type { VoteInput, GuestVoteInput } from "./votes.types";

const prisma = new PrismaClient();

export class VotesService {
  async vote(userId: string, pollId: string, input: VoteInput) {
    // Check if poll is active
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      select: { is_active: true, status: true, options: true },
    });

    if (!poll || !poll.is_active || poll.status !== "ACTIVE") {
      throw new Error("Poll is not active");
    }

    if (input.option_index >= poll.options.length) {
      throw new Error("Invalid option index");
    }

    // Check for existing vote (one vote per user per poll)
    const existingVote = await prisma.vote.findUnique({
      where: { user_id_poll_id: { user_id: userId, poll_id: pollId } },
    });

    if (existingVote) {
      throw new Error("You have already voted on this poll");
    }

    // Create vote
    const vote = await prisma.vote.create({
      data: {
        user_id: userId,
        poll_id: pollId,
        option_index: input.option_index,
      },
    });

    // Update assignment as voted
    await prisma.userPollAssignment.updateMany({
      where: { user_id: userId, poll_id: pollId },
      data: { is_voted: true },
    });

    // Record engagement
    await prisma.userEngagement.create({
      data: {
        user_id: userId,
        poll_id: pollId,
        action: "VOTE",
      },
    });

    // Update streak
    await this.updateVoteStreak(userId);

    // Check for First Vote badge
    const totalVotes = await prisma.vote.count({ where: { user_id: userId } });
    if (totalVotes === 1) {
      await this.awardBadgeIfNotExists(userId, "FIRST_VOTE");
    }

    // Store private reason if provided
    if (input.reason) {
      await redis.setex(`vote_reason:${userId}:${pollId}`, 86400 * 30, input.reason);
    }

    logger.info("Vote recorded", { userId, pollId, optionIndex: input.option_index });
    return vote;
  }

  async guestVote(pollId: string, input: GuestVoteInput, ip?: string) {
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      select: { is_active: true, status: true, options: true },
    });

    if (!poll || !poll.is_active || poll.status !== "ACTIVE") {
      throw new Error("Poll is not active");
    }

    if (input.option_index >= poll.options.length) {
      throw new Error("Invalid option index");
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

    return guestVote;
  }

  async transferGuestVotes(sessionId: string, userId: string) {
    const guestVotes = await prisma.guestVote.findMany({
      where: { session_id: sessionId, converted_user_id: null },
    });

    for (const gv of guestVotes) {
      // Check if user hasn't already voted on this poll
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
      // Already voted today, no change
      return;
    } else if (lastVote && lastVote.getTime() === yesterday.getTime()) {
      // Voted yesterday, increment streak
      newStreak += 1;
    } else if (lastVote && lastVote.getTime() < yesterday.getTime()) {
      // Streak broken - check recovery
      if (!streak.recovery_used) {
        newStreak = 1;
        recoveryUsed = true; // Use recovery
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

    // Check streak badges
    if (newStreak >= 7) {
      await this.awardBadgeIfNotExists(userId, "CONSISTENT_VOICE");
    }
    if (newStreak >= 30) {
      await this.awardBadgeIfNotExists(userId, "PULSE_PATRIOT");
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
