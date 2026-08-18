import { PrismaClient } from "@prisma/client";
import { logger } from "../../common/interceptors/logger";
import { topicsService } from "../topics/topics.service";
import type { CreatePollInput } from "./polls.types";

const prisma = new PrismaClient();

export class PollsService {
  async createPoll(adminId: string, input: CreatePollInput) {
    if (input.category === "POLITICS") {
      const region = typeof (input.target_filters as any)?.region === "string" ? (input.target_filters as any).region : "ALL";
      const isBlackoutActive = await this.isElectionBlackoutActive(region);
      if (isBlackoutActive) {
        throw new Error("Political polls are disabled during the active election blackout period for this region.");
      }
    }

    const status = input.status ?? (input.is_active === true ? "ACTIVE" : "DRAFT");
    const isActive = status === "ACTIVE";

    const poll = await prisma.poll.create({
      data: {
        question: input.question,
        options: input.options,
        category: input.category,
        sub_category: input.sub_category,
        start_date: input.start_date ? new Date(input.start_date) : new Date(),
        end_date: input.end_date ? new Date(input.end_date) : null,
        target_filters: input.target_filters || {},
        is_commercial: input.is_commercial,
        sponsor_id: input.sponsor_id,
        created_by: adminId,
        status,
        is_active: isActive,
        seo_title: input.seo_title,
        meta_description: input.meta_description,
        slug: input.slug ?? this.createSlug(input.question),
        keywords: input.keywords ?? [],
        hashtags: input.hashtags ?? [],
        facebook_caption: input.facebook_caption,
        instagram_caption: input.instagram_caption,
        x_caption: input.x_caption,
        whatsapp_share_text: input.whatsapp_share_text,
        ai_summary: input.ai_summary,
        faq: input.faq ?? [],
        og_title: input.og_title,
        og_description: input.og_description,
      },
    });

    if (input.topic_names && input.topic_names.length > 0) {
      const topicNames = Array.from(new Set(input.topic_names.filter(Boolean)));
      const topicRecords = await Promise.all(topicNames.map(async (name) => {
        const normalizedName = name.trim();
        const existing = await topicsService.getTopicByName(normalizedName);
        if (existing) {
          return existing;
        }
        return topicsService.createTopic({ name: normalizedName, slug: this.createSlug(normalizedName) });
      }));

      await prisma.poll.update({
        where: { id: poll.id },
        data: {
          topics: {
            connect: topicRecords.map((topic) => ({ id: topic.id })),
          },
        },
      });
    }

    // Calculate estimated reach
    const estimatedReach = await this.calculateEstimatedReach(input.target_filters);

    await prisma.poll.update({
      where: { id: poll.id },
      data: { estimated_reach: estimatedReach },
    });

    return { ...poll, estimated_reach: estimatedReach };
  }

  private createSlug(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 100);
  }

  private computePollResults(
    options: string[],
    voteDistribution: Array<{ option_index: number; _count: { option_index: number } }>,
    totalVotes: number
  ) {
    return options.map((option, index) => {
      const voteData = voteDistribution.find((v) => v.option_index === index);
      const count = voteData?._count?.option_index || 0;
      return {
        option,
        index,
        count,
        percentage: totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0,
      };
    });
  }

  async getPendingPolls(query: { page: number; limit: number }) {
    const [polls, total] = await Promise.all([
      prisma.poll.findMany({
        where: { status: { in: ["DRAFT", "PENDING_REVIEW"] }, is_active: false },
        orderBy: { created_at: "desc" },
        skip: (Number(query.page || 1) - 1) * Number(query.limit || 10),
        take: Number(query.limit || 10),
      }),
      prisma.poll.count({ where: { status: { in: ["DRAFT", "PENDING_REVIEW"] }, is_active: false } }),
    ]);

    return {
      polls: polls.map((poll) => ({
        id: poll.id,
        question: poll.question,
        category: poll.category,
        status: poll.status,
        created_at: poll.created_at,
      })),
      pagination: {
        page: Number(query.page || 1),
        limit: Number(query.limit || 10),
        total,
        total_pages: Math.ceil(total / Number(query.limit || 10)),
      },
    };
  }

  async approvePoll(pollId: string) {
    const poll = await prisma.poll.update({
      where: { id: pollId },
      data: { status: "ACTIVE", is_active: true, start_date: new Date() },
    });

    await this.assignPollToUsers(poll.id, poll.target_filters as any);
    return poll;
  }

  async rejectPoll(pollId: string) {
    return prisma.poll.update({
      where: { id: pollId },
      data: { status: "REJECTED", is_active: false },
    });
  }

  async publishPoll(pollId: string) {
    const poll = await prisma.poll.update({
      where: { id: pollId },
      data: { status: "ACTIVE", is_active: true, start_date: new Date() },
    });

    await this.assignPollToUsers(poll.id, poll.target_filters as any);
    return poll;
  }

  async getPollById(pollId: string, userId?: string, guestSessionId?: string) {
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        _count: { select: { votes: true, opinions: true } },
      },
    });

    if (!poll) {
      throw new Error("Poll not found");
    }

    // Get vote distribution
    const [voteDistribution, guestVoteDistribution, guestCount] = await Promise.all([
      prisma.vote.groupBy({ by: ["option_index"], where: { poll_id: pollId }, _count: { option_index: true } }),
      prisma.guestVote.groupBy({ by: ["option_index"], where: { poll_id: pollId }, _count: { option_index: true } }),
      prisma.guestVote.count({ where: { poll_id: pollId } })
    ]);

    const combinedDistribution = [...voteDistribution];
    guestVoteDistribution.forEach((gv: any) => {
      const existing = combinedDistribution.find((v: any) => v.option_index === gv.option_index);
      if (existing) {
        existing._count.option_index += gv._count.option_index;
      } else {
        combinedDistribution.push({ option_index: gv.option_index, _count: { option_index: gv._count.option_index } });
      }
    });

    const totalVotes = poll._count.votes + guestCount;
    const results = this.computePollResults(poll.options, combinedDistribution, totalVotes);

    // Check if user has voted
    let userVote = null;
    let userOpinion = null;
    let userPrediction = null;
    if (userId) {
      userVote = await prisma.vote.findUnique({
        where: { user_id_poll_id: { user_id: userId, poll_id: pollId } },
      });
      userOpinion = await prisma.opinion.findUnique({
        where: { user_id_poll_id: { user_id: userId, poll_id: pollId } },
      });
      userPrediction = await prisma.pollPrediction.findUnique({
        where: { user_id_poll_id: { user_id: userId, poll_id: pollId } },
      });
    }

    let guestVoteIndex: number | null = null;
    if (!userId && guestSessionId) {
      const guestVote = await prisma.guestVote.findFirst({
        where: { poll_id: pollId, session_id: guestSessionId, converted_user_id: null },
      });
      guestVoteIndex = guestVote?.option_index ?? null;
    }

    return {
      ...poll,
      is_commercial: poll.is_commercial ?? false,
      total_votes: totalVotes,
      total_opinions: poll._count.opinions,
      results,
      has_voted: !!userVote || guestVoteIndex !== null,
      user_vote_index: userVote?.option_index ?? guestVoteIndex ?? null,
      has_opinion: !!userOpinion,
      user_opinion: userOpinion
        ? {
            id: userOpinion.id,
            content: userOpinion.content,
            agree_count: userOpinion.agree_count,
            disagree_count: userOpinion.disagree_count,
          }
        : null,
      user_prediction: userPrediction ? userPrediction.predicted_percentage : null,
      // Ensure SEO metadata is included for search engines
      seo_title: poll.seo_title || null,
      og_title: poll.og_title || null,
      og_description: poll.og_description || null,
      meta_description: poll.meta_description || null,
      slug: poll.slug || null,
      keywords: poll.keywords || [],
      hashtags: poll.hashtags || [],
      whatsapp_share_text: poll.whatsapp_share_text || null,
      x_caption: poll.x_caption || null,
      facebook_caption: poll.facebook_caption || null,
    };
  }

  async savePrediction(userId: string, pollId: string, input: { predicted_percentage: number }) {
    const poll = await prisma.poll.findUnique({ where: { id: pollId }, select: { id: true, status: true, is_active: true } });
    if (!poll || !poll.is_active || poll.status !== "ACTIVE") {
      throw new Error("Prediction is only available for active polls");
    }

    const existing = await prisma.pollPrediction.findUnique({ where: { user_id_poll_id: { user_id: userId, poll_id: pollId } } });
    if (existing) {
      return prisma.pollPrediction.update({
        where: { id: existing.id },
        data: { predicted_percentage: input.predicted_percentage },
      });
    }

    return prisma.pollPrediction.create({
      data: {
        user_id: userId,
        poll_id: pollId,
        predicted_percentage: input.predicted_percentage,
      },
    });
  }

  async getEstimatedReach(filters: any) {
    return this.calculateEstimatedReach(filters);
  }

  async getPolls(
    query: { category?: string; status: string; page: number; limit: number; search?: string },
    userId?: string,
    guestSessionId?: string
  ) {
    const where: any = {};
    const region = typeof (query as any).region === "string" && (query as any).region ? (query as any).region : "ALL";

    if (query.category && query.category !== "ALL") {
      where.category = query.category;
    }

    if (typeof query.search === "string" && query.search.trim()) {
      where.question = {
        contains: query.search.trim(),
        mode: "insensitive",
      };
    }

    if (query.status !== "ALL") {
      where.status = query.status;
    }

    where.is_active = true;
    where.status = "ACTIVE";

    const isBlackoutActive = await this.isElectionBlackoutActive(region);
    if (isBlackoutActive) {
      if (!query.category || query.category === "ALL" || query.category === "POLITICS") {
        where.category = { not: "POLITICS" };
      }
    }

    const [polls, total] = await Promise.all([
      prisma.poll.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (Number(query.page || 1) - 1) * Number(query.limit || 10),
        take: Number(query.limit || 10),
        include: {
          _count: { select: { votes: true, opinions: true } },
        },
      }),
      prisma.poll.count({ where }),
    ]);

    const pollIds = polls.map((poll) => poll.id);
    const [voteDistribution, guestVoteDistribution] = await Promise.all([
      prisma.vote.groupBy({ by: ["poll_id", "option_index"], where: { poll_id: { in: pollIds } }, _count: { option_index: true } }),
      prisma.guestVote.groupBy({ by: ["poll_id", "option_index"], where: { poll_id: { in: pollIds } }, _count: { option_index: true } })
    ]);

    const voteDistributionByPoll = new Map();
    const guestCountMap = new Map();

    voteDistribution.forEach((vote: any) => {
      const existing = voteDistributionByPoll.get(vote.poll_id) || [];
      existing.push({ option_index: vote.option_index, _count: { option_index: vote._count.option_index } });
      voteDistributionByPoll.set(vote.poll_id, existing);
    });

    guestVoteDistribution.forEach((gVote: any) => {
      const existing = voteDistributionByPoll.get(gVote.poll_id) || [];
      const match = existing.find((v: any) => v.option_index === gVote.option_index);
      if (match) {
        match._count.option_index += gVote._count.option_index;
      } else {
        existing.push({ option_index: gVote.option_index, _count: { option_index: gVote._count.option_index } });
      }
      voteDistributionByPoll.set(gVote.poll_id, existing);

      // Mathematically tally the guest votes per poll for the final output
      guestCountMap.set(gVote.poll_id, (guestCountMap.get(gVote.poll_id) || 0) + gVote._count.option_index);
    });

    const currentVotes = userId
      ? await prisma.vote.findMany({
          where: { poll_id: { in: pollIds }, user_id: userId },
          select: { poll_id: true, option_index: true },
          orderBy: { voted_at: "desc" },
        })
      : guestSessionId
      ? await prisma.guestVote.findMany({
          where: { poll_id: { in: pollIds }, session_id: guestSessionId, converted_user_id: null },
          select: { poll_id: true, option_index: true },
          orderBy: { voted_at: "desc" },
        })
      : [];

    const userVoteMap = new Map<string, number>();
    for (const vote of currentVotes) {
      if (!userVoteMap.has(vote.poll_id)) {
        userVoteMap.set(vote.poll_id, vote.option_index);
      }
    }

    return {
      polls: polls.map((poll) => {
        const totalVotes = poll._count.votes + (guestCountMap.get(poll.id) || 0);
        const results = this.computePollResults(poll.options, voteDistributionByPoll.get(poll.id) || [], totalVotes);
        const userVoteIndex = userVoteMap.has(poll.id) ? userVoteMap.get(poll.id) ?? null : null;

        return {
          id: poll.id,
          question: poll.question,
          options: poll.options,
          category: poll.category,
          status: poll.status,
          is_commercial: poll.is_commercial ?? false,
          total_votes: totalVotes,
          total_opinions: poll._count.opinions,
          created_at: poll.created_at,
          results,
          has_voted: userVoteMap.has(poll.id),
          user_vote_index: userVoteIndex,
          // SEO & Social metadata
          seo_title: poll.seo_title || null,
          og_title: poll.og_title || null,
          og_description: poll.og_description || null,
          slug: poll.slug || null,
          keywords: poll.keywords || [],
          hashtags: poll.hashtags || [],
      whatsapp_share_text: poll.whatsapp_share_text || null,
      x_caption: poll.x_caption || null,
      facebook_caption: poll.facebook_caption || null,
        };
      }),
      pagination: {
        page: Number(query.page || 1),
        limit: Number(query.limit || 10),
        total,
        total_pages: Math.ceil(total / Number(query.limit || 10)),
      },
    };
  }

  async archivePoll(pollId: string) {
    return prisma.poll.update({
      where: { id: pollId },
      data: { status: "ARCHIVED", is_active: false },
    });
  }

  private async isElectionBlackoutActive(region: string): Promise<boolean> {
    const now = new Date();
    const blackout = await prisma.electionBlackout.findFirst({
      where: {
        active: true,
        blackout_starts: { lte: now },
        polling_date: { gte: now },
        OR: [{ region }, { region: "ALL" }],
      },
    });
    return !!blackout;
  }

  private async calculateEstimatedReach(filters: any): Promise<number> {
    if (!filters || Object.keys(filters).length === 0) {
      return prisma.user.count({ where: { is_active: true } });
    }

    const where: any = { is_active: true };

    if (filters.states?.length) {
      where.state = { in: filters.states };
    }
    if (filters.city_tiers?.length) {
      where.city_tier = { in: filters.city_tiers };
    }

    // For profile-based filters, we need to join
    const profileWhere: any = {};
    if (filters.age_brackets?.length) profileWhere.age_bracket = { in: filters.age_brackets };
    if (filters.genders?.length) profileWhere.gender = { in: filters.genders };
    if (filters.income_brackets?.length) profileWhere.income_bracket = { in: filters.income_brackets };
    if (filters.education?.length) profileWhere.education = { in: filters.education };
    if (filters.employment?.length) profileWhere.employment = { in: filters.employment };
    if (filters.vehicle_ownership?.length) profileWhere.vehicle = { in: filters.vehicle_ownership };

    if (Object.keys(profileWhere).length > 0) {
      return prisma.user.count({
        where: {
          ...where,
          profile: { ...profileWhere },
        },
      });
    }

    return prisma.user.count({ where });
  }

  private async assignPollToUsers(pollId: string, filters: any) {
    const where: any = { is_active: true };

    if (filters?.states?.length) where.state = { in: filters.states };
    if (filters?.city_tiers?.length) where.city_tier = { in: filters.city_tiers };

    const profileWhere: any = {};
    if (filters?.age_brackets?.length) profileWhere.age_bracket = { in: filters.age_brackets };
    if (filters?.genders?.length) profileWhere.gender = { in: filters.genders };
    if (filters?.income_brackets?.length) profileWhere.income_bracket = { in: filters.income_brackets };
    if (filters?.education?.length) profileWhere.education = { in: filters.education };
    if (filters?.employment?.length) profileWhere.employment = { in: filters.employment };
    if (filters?.vehicle_ownership?.length) profileWhere.vehicle = { in: filters.vehicle_ownership };

    const query: any = { where };
    if (Object.keys(profileWhere).length > 0) {
      query.where.profile = profileWhere;
    }

    const users = await prisma.user.findMany({
      ...query,
      select: { id: true },
    });

    // Bulk insert assignments
    const assignments = users.map((u) => ({
      user_id: u.id,
      poll_id: pollId,
    }));

    if (assignments.length > 0) {
      await prisma.userPollAssignment.createMany({
        data: assignments,
        skipDuplicates: true,
      });
    }

    logger.info(`Assigned poll ${pollId} to ${assignments.length} users`);
  }

  // --- VIRAL LOOP METHODS ---
  async recordShare(userId: string, pollId: string) {
    return prisma.pollShareUnlock.upsert({
      where: { user_id_poll_id: { user_id: userId, poll_id: pollId } },
      update: { shared_at: new Date() },
      create: { user_id: userId, poll_id: pollId, platform: 'native' }
    });
  }

  async checkUnlockStatus(userId: string, pollId: string) {
    const unlock = await prisma.pollShareUnlock.findUnique({
      where: { user_id_poll_id: { user_id: userId, poll_id: pollId } }
    });
    return { unlocked: !!unlock };
  }
}
export const pollsService = new PollsService();
