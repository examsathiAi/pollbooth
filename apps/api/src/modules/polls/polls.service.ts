import { PrismaClient } from "@prisma/client";
import { logger } from "../../common/interceptors/logger";
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
        status: "DRAFT",
      },
    });

    // Calculate estimated reach
    const estimatedReach = await this.calculateEstimatedReach(input.target_filters);

    await prisma.poll.update({
      where: { id: poll.id },
      data: { estimated_reach: estimatedReach },
    });

    // Auto-assign to matching users if active
    if (poll.status === "ACTIVE") {
      await this.assignPollToUsers(poll.id, input.target_filters);
    }

    return { ...poll, estimated_reach: estimatedReach };
  }

  async publishPoll(pollId: string) {
    const poll = await prisma.poll.update({
      where: { id: pollId },
      data: { status: "ACTIVE", start_date: new Date() },
    });

    await this.assignPollToUsers(poll.id, poll.target_filters as any);
    return poll;
  }

  async getPollById(pollId: string, userId?: string) {
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
    const voteDistribution = await prisma.vote.groupBy({
      by: ["option_index"],
      where: { poll_id: pollId },
      _count: { option_index: true },
    });

    const totalVotes = poll._count.votes;
    const results = poll.options.map((option, index) => {
      const voteData = voteDistribution.find((v) => v.option_index === index);
      const count = voteData?._count?.option_index || 0;
      return {
        option,
        index,
        count,
        percentage: totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0,
      };
    });

    // Check if user has voted
    let userVote = null;
    let userOpinion = null;
    if (userId) {
      userVote = await prisma.vote.findUnique({
        where: { user_id_poll_id: { user_id: userId, poll_id: pollId } },
      });
      userOpinion = await prisma.opinion.findUnique({
        where: { user_id_poll_id: { user_id: userId, poll_id: pollId } },
      });
    }

    return {
      ...poll,
      total_votes: totalVotes,
      total_opinions: poll._count.opinions,
      results,
      has_voted: !!userVote,
      user_vote_index: userVote?.option_index ?? null,
      has_opinion: !!userOpinion,
      user_opinion: userOpinion
        ? {
            id: userOpinion.id,
            content: userOpinion.content,
            agree_count: userOpinion.agree_count,
            disagree_count: userOpinion.disagree_count,
          }
        : null,
    };
  }

  async getPolls(query: { category?: string; status: string; page: number; limit: number }) {
    const where: any = {};
    const region = typeof (query as any).region === "string" && (query as any).region ? (query as any).region : "ALL";

    if (query.category && query.category !== "ALL") {
      where.category = query.category;
    }

    if (query.status !== "ALL") {
      where.status = query.status;
    }

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
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          _count: { select: { votes: true, opinions: true } },
        },
      }),
      prisma.poll.count({ where }),
    ]);

    return {
      polls: polls.map((poll) => ({
        id: poll.id,
        question: poll.question,
        options: poll.options,
        category: poll.category,
        status: poll.status,
        total_votes: poll._count.votes,
        total_opinions: poll._count.opinions,
        created_at: poll.created_at,
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        total_pages: Math.ceil(total / query.limit),
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
}

export const pollsService = new PollsService();
