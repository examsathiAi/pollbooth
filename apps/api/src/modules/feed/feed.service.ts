import { PrismaClient } from "@prisma/client";
import { logger } from "../../common/interceptors/logger";

const prisma = new PrismaClient();

export class FeedService {
  private mapPollSummary(poll: any, hasVoted: boolean = false) {
    return {
      id: poll.id,
      question: poll.question,
      options: poll.options,
      category: poll.category,
      is_commercial: poll.is_commercial ?? false,
      total_votes: poll._count?.votes ?? 0,
      total_opinions: poll._count?.opinions ?? 0,
      has_voted: hasVoted,
      created_at: poll.created_at,
    };
  }

  private dedupePolls(polls: any[]) {
    return Array.from(new Map(polls.map((poll) => [poll.id, poll])).values());
  }

  async getForYouFeed(userId: string, page: number, limit: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const assignedPolls = await prisma.userPollAssignment.findMany({
      where: {
        user_id: userId,
        is_voted: false,
        poll: { is_active: true, status: "ACTIVE" },
      },
      include: {
        poll: {
          include: {
            _count: { select: { votes: true, opinions: true } },
          },
        },
      },
      orderBy: { assigned_at: "desc" },
      take: limit,
    });

    const assignedIds = assignedPolls.map((a) => a.poll_id);
    const assignedOrganicPolls = assignedPolls.filter((a) => !a.poll.is_commercial).map((a) => a.poll);
    const assignedSponsoredPolls = assignedPolls.filter((a) => a.poll.is_commercial).map((a) => a.poll);

    const organicTrendingPolls = await prisma.poll.findMany({
      where: {
        is_active: true,
        status: "ACTIVE",
        is_commercial: false,
        id: { notIn: assignedIds.length > 0 ? assignedIds : undefined },
      },
      include: {
        _count: { select: { votes: true, opinions: true } },
      },
      orderBy: { created_at: "desc" },
      take: Math.floor(limit / 2),
    });

    const sponsoredTrendingPolls = await prisma.poll.findMany({
      where: {
        is_active: true,
        status: "ACTIVE",
        is_commercial: true,
        id: { notIn: assignedIds.length > 0 ? assignedIds : undefined },
      },
      include: {
        _count: { select: { votes: true, opinions: true } },
      },
      orderBy: { created_at: "desc" },
      take: Math.max(2, Math.floor(limit / 4)),
    });

    const organicLocalPolls = user.city
      ? await prisma.poll.findMany({
          where: {
            is_active: true,
            status: "ACTIVE",
            is_commercial: false,
            target_filters: {
              path: ["cities"],
              array_contains: user.city,
            },
            id: {
              notIn: assignedIds.length > 0 ? [...assignedIds, ...organicTrendingPolls.map((p) => p.id)] : undefined,
            },
          },
          include: {
            _count: { select: { votes: true, opinions: true } },
          },
          take: 3,
        })
      : [];

    const sponsoredLocalPolls = user.city
      ? await prisma.poll.findMany({
          where: {
            is_active: true,
            status: "ACTIVE",
            is_commercial: true,
            target_filters: {
              path: ["cities"],
              array_contains: user.city,
            },
            id: {
              notIn: assignedIds.length > 0 ? [...assignedIds, ...sponsoredTrendingPolls.map((p) => p.id)] : undefined,
            },
          },
          include: {
            _count: { select: { votes: true, opinions: true } },
          },
          take: 2,
        })
      : [];

    const organicPolls = this.dedupePolls([...assignedOrganicPolls, ...organicTrendingPolls, ...organicLocalPolls]);
    const sponsoredPolls = this.dedupePolls([...assignedSponsoredPolls, ...sponsoredTrendingPolls, ...sponsoredLocalPolls]);

    const uniqueIds = [...organicPolls, ...sponsoredPolls].map((p) => p.id);
    const userVotes = uniqueIds.length > 0
      ? await prisma.vote.findMany({
          where: {
            user_id: userId,
            poll_id: { in: uniqueIds },
          },
        })
      : [];
    const votedPollIds = new Set(userVotes.map((v) => v.poll_id));

    return {
      organic: organicPolls.map((poll) => this.mapPollSummary(poll, votedPollIds.has(poll.id))),
      sponsored: sponsoredPolls.map((poll) => this.mapPollSummary(poll, votedPollIds.has(poll.id))),
      pagination: {
        page,
        limit,
        total: organicPolls.length + sponsoredPolls.length,
      },
    };
  }

  async getTrendingFeed(page: number, limit: number) {
    const [organicPolls, sponsoredPolls] = await Promise.all([
      prisma.poll.findMany({
        where: { is_active: true, status: "ACTIVE", is_commercial: false },
        include: {
          _count: { select: { votes: true, opinions: true } },
        },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.poll.findMany({
        where: { is_active: true, status: "ACTIVE", is_commercial: true },
        include: {
          _count: { select: { votes: true, opinions: true } },
        },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * Math.max(2, Math.floor(limit / 4)),
        take: Math.max(2, Math.floor(limit / 4)),
      }),
    ]);

    return {
      organic: organicPolls.map((poll) => this.mapPollSummary(poll)),
      sponsored: sponsoredPolls.map((poll) => this.mapPollSummary(poll)),
      pagination: { page, limit, total: organicPolls.length + sponsoredPolls.length },
    };
  }

  async getLocalFeed(userId: string, page: number, limit: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { city: true, state: true },
    });

    if (!user?.city && !user?.state) {
      return { polls: [], pagination: { page, limit, total: 0 } };
    }

    const orConditions: any[] = [];
    if (user.city) {
      orConditions.push({ target_filters: { path: ["cities"], array_contains: user.city } });
    }
    if (user.state) {
      orConditions.push({ target_filters: { path: ["states"], array_contains: user.state } });
    }

    const [organicPolls, sponsoredPolls] = await Promise.all([
      prisma.poll.findMany({
        where: {
          is_active: true,
          status: "ACTIVE",
          is_commercial: false,
          OR: orConditions,
        },
        include: {
          _count: { select: { votes: true, opinions: true } },
        },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.poll.findMany({
        where: {
          is_active: true,
          status: "ACTIVE",
          is_commercial: true,
          OR: orConditions,
        },
        include: {
          _count: { select: { votes: true, opinions: true } },
        },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * Math.max(2, Math.floor(limit / 4)),
        take: Math.max(2, Math.floor(limit / 4)),
      }),
    ]);

    return {
      organic: organicPolls.map((poll) => this.mapPollSummary(poll)),
      sponsored: sponsoredPolls.map((poll) => this.mapPollSummary(poll)),
      pagination: { page, limit, total: organicPolls.length + sponsoredPolls.length },
    };
  }

  async getDailyDigest(date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const digest = await prisma.dailyDigest.findUnique({
      where: { date: targetDate },
    });

    if (digest?.is_published) {
      return digest.content;
    }

    // Generate digest from top polls
    const yesterday = new Date(targetDate);
    yesterday.setDate(yesterday.getDate() - 1);

    const topPolls = await prisma.poll.findMany({
      where: {
        is_active: true,
        created_at: { gte: yesterday, lt: targetDate },
      },
      include: {
        _count: { select: { votes: true } },
      },
      orderBy: { created_at: "desc" },
      take: 5,
    });

    const formatted = topPolls.map((poll) => ({
      id: poll.id,
      question: poll.question,
      category: poll.category,
      is_commercial: poll.is_commercial ?? false,
      total_votes: poll._count.votes,
    }));

    return {
      date: targetDate.toISOString().split("T")[0],
      title: `Your Pulse Digest: ${targetDate.toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })}`,
      stories: formatted,
    };
  }

  async getRelatedPolls(userId: string, pollId: string, limit: number = 5) {
    // Get polls in same category that user hasn't voted on
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      select: { category: true },
    });

    if (!poll) {
      throw new Error("Poll not found");
    }

    const votedPollIds = (
      await prisma.vote.findMany({
        where: { user_id: userId },
        select: { poll_id: true },
      })
    ).map((v) => v.poll_id);

    const related = await prisma.poll.findMany({
      where: {
        category: poll.category,
        is_active: true,
        status: "ACTIVE",
        id: { notIn: [...votedPollIds, pollId] },
      },
      include: {
        _count: { select: { votes: true, opinions: true } },
      },
      take: limit,
    });

    return related.map((p) => ({
      id: p.id,
      question: p.question,
      options: p.options,
      is_commercial: p.is_commercial ?? false,
      total_votes: p._count.votes,
      total_opinions: p._count.opinions,
    }));
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

    // Build cohort query based on user's demographics
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

    // Remove undefined values
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
        ? cohortVotes.some(
            (v) =>
              v.option_index === userVote.option_index &&
              v._count.option_index === Math.max(...cohortVotes.map((c) => c._count.option_index))
          )
        : null,
    };
  }
}

export const feedService = new FeedService();
