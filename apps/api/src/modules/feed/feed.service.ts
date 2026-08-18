import { PrismaClient } from "@prisma/client";
import { topicsService } from "../topics/topics.service";
import { getCachedOrFetch } from "../../common/utils/cache.util";

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
      seo_title: poll.seo_title || null,
      og_title: poll.og_title || null,
      og_description: poll.og_description || null,
      slug: poll.slug || null,
      hashtags: poll.hashtags || [],
      whatsapp_share_text: poll.whatsapp_share_text || null,
      x_caption: poll.x_caption || null,
      facebook_caption: poll.facebook_caption || null,
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
    const cacheKey = `feed:trending:page_${page}:limit_${limit}`;
    return getCachedOrFetch(cacheKey, 60, async () => {
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
    });
  }

  async getPlatformStats() {
    return getCachedOrFetch("platform:stats:global", 120, async () => {
      const [totalUsers, totalPolls, regVotes, guestVotes, regVotesLastHour, guestVotesLastHour] = await Promise.all([
        prisma.user.count(),
        prisma.poll.count(),
        prisma.vote.count(),
        prisma.guestVote.count(),
        prisma.vote.count({ where: { voted_at: { gte: new Date(Date.now() - 60 * 60 * 1000) } } }),
        prisma.guestVote.count({ where: { voted_at: { gte: new Date(Date.now() - 60 * 60 * 1000) } } })
      ]);
      const totalVotes = regVotes + guestVotes;
      const votesLastHour = regVotesLastHour + guestVotesLastHour;

      return {
        totals: {
          users: totalUsers,
          polls: totalPolls,
          votes: totalVotes,
        },
        recent_activity: {
          votes_last_hour: votesLastHour,
        },
      };
    });
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
      title: `Your PollBooth Digest: ${targetDate.toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })}`,
      stories: formatted,
    };
  }

  async getRelatedPolls(userId: string, pollId: string, limit: number = 5) {
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
        ? cohortVotes.some(
            (v) =>
              v.option_index === userVote.option_index &&
              v._count.option_index === Math.max(...cohortVotes.map((c) => c._count.option_index))
          )
        : null,
    };
  }

  async getInsights(limit: number = 10) {
    const insights = await prisma.pollInsight.findMany({
      where: { is_published: true },
      orderBy: { created_at: "desc" },
      take: limit,
      include: {
        poll: {
          select: {
            id: true,
            question: true,
            category: true,
            options: true,
            _count: { select: { votes: true, opinions: true } }
          }
        }
      }
    });

    return insights.map((insight) => ({
      id: insight.id,
      poll_id: insight.poll_id,
      headline: insight.headline,
      content: insight.content,
      demographics_summary: insight.demographics_summary,
      created_at: insight.created_at,
      poll: {
        id: insight.poll.id,
        question: insight.poll.question,
        category: insight.poll.category,
        options: insight.poll.options,
        total_votes: insight.poll._count.votes,
        total_opinions: insight.poll._count.opinions
      }
    }));
  }

  async getInsightById(id: string) {
    const insight = await prisma.pollInsight.findUnique({
      where: { id },
      include: {
        poll: {
          include: {
            _count: { select: { votes: true, opinions: true } }
          }
        }
      }
    });

    if (!insight) {
      throw new Error("Insight report not found");
    }

    return {
      id: insight.id,
      poll_id: insight.poll_id,
      headline: insight.headline,
      content: insight.content,
      demographics_summary: insight.demographics_summary,
      created_at: insight.created_at,
      poll: {
        id: insight.poll.id,
        question: insight.poll.question,
        category: insight.poll.category,
        options: insight.poll.options,
        total_votes: insight.poll._count.votes,
        total_opinions: insight.poll._count.opinions
      }
    };
  }

  async getTopicFeed(userId: string, topicSlugs: string[], page: number, limit: number) {
    if (topicSlugs.length === 0) {
      return { polls: [], topics: [], pagination: { page, limit, total: 0 } };
    }

    const [polls, userVotes] = await Promise.all([
      topicsService.getPollsByTopics(topicSlugs, limit * 2),
      prisma.vote.findMany({
        where: {
          user_id: userId,
          poll_id: {
            in: (await topicsService.getPollsByTopics(topicSlugs, limit * 2)).map((p) => p.id),
          },
        },
        select: { poll_id: true },
      }),
    ]);

    const votedPollIds = new Set(userVotes.map((v) => v.poll_id));

    const organic = polls.filter((p) => !p.is_commercial);
    const sponsored = polls.filter((p) => p.is_commercial);

    return {
      organic: organic
        .slice(0, Math.floor(limit * 0.75))
        .map((poll) => ({
          id: poll.id,
          question: poll.question,
          options: poll.options,
          category: poll.category,
          is_commercial: poll.is_commercial ?? false,
          total_votes: poll._count?.votes ?? 0,
          total_opinions: poll._count?.opinions ?? 0,
          has_voted: votedPollIds.has(poll.id),
          topics: poll.topics.map((t) => ({ slug: t.slug, name: t.name })),
          created_at: poll.created_at,
        })),
      sponsored: sponsored.slice(0, Math.max(2, Math.floor(limit * 0.25))).map((poll) => ({
        id: poll.id,
        question: poll.question,
        options: poll.options,
        category: poll.category,
        is_commercial: poll.is_commercial ?? false,
        total_votes: poll._count?.votes ?? 0,
        total_opinions: poll._count?.opinions ?? 0,
        has_voted: votedPollIds.has(poll.id),
        topics: poll.topics.map((t) => ({ slug: t.slug, name: t.name })),
        created_at: poll.created_at,
      })),
      topics: topicSlugs.slice(0, 5),
      pagination: {
        page,
        limit,
        total: polls.length,
        total_pages: Math.ceil(polls.length / limit),
      },
    };
  }

  // --- DISCOVER FEED ---
  async getDiscoverFeed(userId: string, page: number, limit: number) {
    // 1. Get polls user has already voted on
    const userVotes = await prisma.vote.findMany({
      where: { user_id: userId },
      select: { poll_id: true }
    });
    const votedIds = userVotes.map(v => v.poll_id);

    // 2. Fetch random active organic polls they haven't voted on
    const organicPolls = await prisma.poll.findMany({
      where: {
        is_active: true,
        status: "ACTIVE",
        is_commercial: false,
        id: { notIn: votedIds }
      },
      include: {
        _count: { select: { votes: true, opinions: true } }
      },
      // In PostgreSQL/MySQL we would use raw ORDER BY RANDOM(). 
      // For Prisma, sorting by created_at desc is the safest deterministic fallback for "discovery" of new items
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit
    });

    // 3. Fetch random active sponsored polls they haven't voted on
    const sponsoredPolls = await prisma.poll.findMany({
      where: {
        is_active: true,
        status: "ACTIVE",
        is_commercial: true,
        id: { notIn: votedIds }
      },
      include: {
        _count: { select: { votes: true, opinions: true } }
      },
      orderBy: { created_at: "desc" },
      skip: (page - 1) * Math.max(2, Math.floor(limit / 4)),
      take: Math.max(2, Math.floor(limit / 4))
    });

    return {
      organic: organicPolls.map((poll) => this.mapPollSummary(poll, false)),
      sponsored: sponsoredPolls.map((poll) => this.mapPollSummary(poll, false)),
      pagination: { 
        page, 
        limit, 
        total: organicPolls.length + sponsoredPolls.length,
        has_more: organicPolls.length === limit
      }
    };
  }
}

export const feedService = new FeedService();
