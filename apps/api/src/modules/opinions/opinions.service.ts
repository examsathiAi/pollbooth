import { PrismaClient } from "@prisma/client";
import { logger } from "../../common/interceptors/logger";
import type { CreateOpinionInput, ReactOpinionInput } from "./opinions.types";

const prisma = new PrismaClient();

export class OpinionsService {
  async createOpinion(userId: string, pollId: string, input: CreateOpinionInput) {
    // Check if user has voted
    const vote = await prisma.vote.findUnique({
      where: { user_id_poll_id: { user_id: userId, poll_id: pollId } },
    });

    if (!vote) {
      throw new Error("You must vote before sharing an opinion");
    }

    // Check if user already has an opinion on this poll
    const existing = await prisma.opinion.findUnique({
      where: { user_id_poll_id: { user_id: userId, poll_id: pollId } },
    });

    if (existing) {
      // Allow edit within 15 minutes
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      if (existing.created_at > fifteenMinutesAgo) {
        return prisma.opinion.update({
          where: { id: existing.id },
          data: {
            content: input.content,
            edited_at: new Date(),
          },
        });
      }
      throw new Error("You can only edit your opinion within 15 minutes of posting");
    }

    // Check moderation status
    const modStatus = await prisma.userModerationStatus.findUnique({
      where: { user_id: userId },
    });

    if (modStatus?.is_permanently_banned) {
      throw new Error("You are permanently banned from posting opinions");
    }

    if (modStatus?.comment_banned_until && modStatus.comment_banned_until > new Date()) {
      throw new Error(`Your opinion feature is disabled until ${modStatus.comment_banned_until.toISOString()}`);
    }

    // Run L1 keyword filter
    const profanityResult = await this.checkProfanity(input.content);
    if (profanityResult.hasProfanity) {
      await this.recordModerationAction(userId, null, "KEYWORD_FILTER", "Profanity detected: " + profanityResult.matchedWords.join(", "));
      throw new Error("Your opinion contains prohibited language. Please be respectful.");
    }

    // Run L2 ML toxicity check (async, don't block creation)
    this.checkToxicityAsync(userId, input.content);

    const opinion = await prisma.opinion.create({
      data: {
        user_id: userId,
        poll_id: pollId,
        content: input.content,
        moderation_status: "PENDING",
      },
    });

    // Record engagement
    await prisma.userEngagement.create({
      data: {
        user_id: userId,
        poll_id: pollId,
        action: "OPINION",
      },
    });

    logger.info("Opinion created", { userId, pollId, opinionId: opinion.id });
    return opinion;
  }

  async getOpinions(pollId: string, userId: string | undefined, sort: string, page: number, limit: number) {
    const blockedUserIds = userId
      ? (await prisma.userBlock.findMany({
          where: { blocker_id: userId },
          select: { blocked_id: true },
        })).map((b) => b.blocked_id)
      : [];

    let orderBy: any = {};
    if (sort === "TOP") {
      orderBy.agree_count = "desc";
    } else if (sort === "NEWEST") {
      orderBy.created_at = "desc";
    } else if (sort === "CONTROVERSIAL") {
      // High agree + high disagree = controversial
      // Using a simple formula: (agree_count + disagree_count) where both are significant
      orderBy = [
        { agree_count: "desc" },
        { disagree_count: "desc" },
      ];
    }

    const [opinions, total] = await Promise.all([
      prisma.opinion.findMany({
        where: {
          poll_id: pollId,
          is_hidden: false,
          moderation_status: { not: "REJECTED" },
          user_id: { notIn: blockedUserIds },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              city: true,
              state: true,
              profile: {
                select: {
                  age_bracket: true,
                  gender: true,
                },
              },
            },
          },
          _count: {
            select: { reactions: true },
          },
        },
      }),
      prisma.opinion.count({
        where: {
          poll_id: pollId,
          is_hidden: false,
          moderation_status: { not: "REJECTED" },
          user_id: { notIn: blockedUserIds },
        },
      }),
    ]);

    // Check if user has reacted to each opinion
    let userReactions: Map<string, string> = new Map();
    if (userId) {
      const reactions = await prisma.opinionReaction.findMany({
        where: {
          user_id: userId,
          opinion_id: { in: opinions.map((o) => o.id) },
        },
      });
      userReactions = new Map(reactions.map((r) => [r.opinion_id, r.reaction_type]));
    }

    return {
      opinions: opinions.map((op) => ({
        id: op.id,
        content: op.content,
        agree_count: op.agree_count,
        disagree_count: op.disagree_count,
        created_at: op.created_at,
        edited_at: op.edited_at,
        demographic_hint: this.buildDemographicHint(op.user),
        user_reaction: userReactions.get(op.id) || null,
      })),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async reactToOpinion(userId: string, opinionId: string, input: ReactOpinionInput) {
    const opinion = await prisma.opinion.findUnique({
      where: { id: opinionId },
    });

    if (!opinion || opinion.is_hidden) {
      throw new Error("Opinion not found");
    }

    // Check if user has already reacted
    const existing = await prisma.opinionReaction.findUnique({
      where: {
        opinion_id_user_id: { opinion_id: opinionId, user_id: userId },
      },
    });

    if (existing) {
      if (existing.reaction_type === input.reaction_type) {
        // Remove reaction (toggle off)
        await prisma.opinionReaction.delete({
          where: { id: existing.id },
        });

        await prisma.opinion.update({
          where: { id: opinionId },
          data: {
            [input.reaction_type === "AGREE" ? "agree_count" : "disagree_count"]: {
              decrement: 1,
            },
          },
        });

        return { action: "removed", reaction_type: input.reaction_type };
      } else {
        // Change reaction
        await prisma.opinionReaction.update({
          where: { id: existing.id },
          data: { reaction_type: input.reaction_type },
        });

        await prisma.opinion.update({
          where: { id: opinionId },
          data: {
            [input.reaction_type === "AGREE" ? "agree_count" : "disagree_count"]: { increment: 1 },
            [existing.reaction_type === "AGREE" ? "agree_count" : "disagree_count"]: { decrement: 1 },
          },
        });

        return { action: "changed", reaction_type: input.reaction_type };
      }
    }

    // New reaction
    await prisma.opinionReaction.create({
      data: {
        opinion_id: opinionId,
        user_id: userId,
        reaction_type: input.reaction_type,
      },
    });

    await prisma.opinion.update({
      where: { id: opinionId },
      data: {
        [input.reaction_type === "AGREE" ? "agree_count" : "disagree_count"]: { increment: 1 },
      },
    });

    // Check for agree-count milestones and send notification
    const updatedOpinion = await prisma.opinion.findUnique({
      where: { id: opinionId },
      select: { agree_count: true, user_id: true },
    });

    if (updatedOpinion && input.reaction_type === "AGREE") {
      const milestones = [50, 100, 500, 1000, 5000];
      if (milestones.includes(updatedOpinion.agree_count)) {
        // Queue notification for milestone
        await this.queueMilestoneNotification(updatedOpinion.user_id, opinionId, updatedOpinion.agree_count);
      }
    }

    return { action: "added", reaction_type: input.reaction_type };
  }

  async deleteOpinion(userId: string, opinionId: string) {
    const opinion = await prisma.opinion.findUnique({
      where: { id: opinionId },
    });

    if (!opinion || opinion.user_id !== userId) {
      throw new Error("Opinion not found or unauthorized");
    }

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (opinion.created_at < fifteenMinutesAgo) {
      throw new Error("You can only delete your opinion within 15 minutes of posting");
    }

    await prisma.opinion.delete({
      where: { id: opinionId },
    });

    return { message: "Opinion deleted successfully" };
  }

  private buildDemographicHint(user: any): string | null {
    const parts: string[] = [];
    if (user?.profile?.age_bracket) {
      const ageMap: Record<string, string> = {
        GEN_Z: "Gen Z",
        MILLENNIAL: "Millennial",
        GEN_X: "Gen X",
        BOOMER: "Boomer",
      };
      parts.push(ageMap[user.profile.age_bracket] || user.profile.age_bracket);
    }
    if (user?.city) {
      parts.push(user.city);
    }
    return parts.length > 0 ? parts.join(", ") : null;
  }

  private async checkProfanity(text: string): Promise<{ hasProfanity: boolean; matchedWords: string[] }> {
    // Hindi + English profanity regex patterns.
    // NOTE: the Hindi pattern list below is intentionally left as a short,
    // clearly-marked placeholder rather than reconstructed guesswork - the
    // original file's Hindi terms were corrupted into literal "?" characters
    // (a Unicode encoding failure upstream), which is not just cosmetic: it
    // was an invalid regex that would throw at runtime on the very first
    // opinion post. Replace TODO_HINDI_TERM_N below with real, reviewed
    // terms before relying on this filter in production - do not paste in
    // guessed transliterations, since a wrong or offensive placeholder here
    // is worse than an honest gap.
    const profanityPatterns = [
      // English profanity (basic set - expand as needed)
      /\b(f+u+c+k+|s+h+i+t+|b+i+t+c+h+|a+s+s+h+o+l+e+|d+i+c+k+|c+u+n+t+)\b/gi,
      // Hindi profanity - PLACEHOLDER, see note above. This pattern currently
      // matches nothing (by design) until real terms are added, so it fails
      // safe (does not block posts) rather than crashing the server.
      /(?!)/,
    ];

    const matchedWords: string[] = [];
    for (const pattern of profanityPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        matchedWords.push(...matches);
      }
    }

    return { hasProfanity: matchedWords.length > 0, matchedWords };
  }

  private async checkToxicityAsync(userId: string, content: string) {
    // In production: call Perspective API or AWS Comprehend
    // For now, log and queue for review
    logger.info("Queued for ML toxicity check", { userId, content: content.substring(0, 50) });
  }

  private async recordModerationAction(userId: string, opinionId: string | null, actionType: string, reason: string) {
    await prisma.moderationAction.create({
      data: {
        user_id: userId,
        opinion_id: opinionId,
        action_type: actionType,
        reason,
        triggered_by: "SYSTEM",
      },
    });
  }

  private async queueMilestoneNotification(userId: string, opinionId: string, agreeCount: number) {
    // This would queue a notification via BullMQ
    logger.info("Milestone notification queued", { userId, opinionId, agreeCount });
  }
}

export const opinionsService = new OpinionsService();
