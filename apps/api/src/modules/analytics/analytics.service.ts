import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class AnalyticsService {
  async getAggregatedResults(pollId: string) {
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        _count: { select: { votes: true } },
      },
    });

    if (!poll) {
      throw new Error("Poll not found");
    }

    // Aggregate by demographics
    const [ageBreakdown, genderBreakdown, cityBreakdown] = await Promise.all([
      this.getDemographicBreakdown(pollId, "age_bracket"),
      this.getDemographicBreakdown(pollId, "gender"),
      this.getCityBreakdown(pollId),
    ]);

    return {
      poll_id: pollId,
      question: poll.question,
      total_votes: poll._count.votes,
      age_breakdown: ageBreakdown,
      gender_breakdown: genderBreakdown,
      city_breakdown: cityBreakdown,
      methodology: {
        sample_size: poll._count.votes,
        region: "India",
        date_range: {
          from: poll.start_date,
          to: poll.end_date || new Date(),
        },
      },
    };
  }

  private async getDemographicBreakdown(pollId: string, field: string) {
    const votes = await prisma.vote.findMany({
      where: { poll_id: pollId },
      include: {
        user: {
          include: { profile: true },
        },
      },
    });

    const breakdown: Record<string, Record<number, number>> = {};

    for (const vote of votes) {
      const value = (vote.user.profile as any)?.[field] || "Unknown";
      if (!breakdown[value]) {
        breakdown[value] = {};
      }
      breakdown[value][vote.option_index] = (breakdown[value][vote.option_index] || 0) + 1;
    }

    return breakdown;
  }

  private async getCityBreakdown(pollId: string) {
    const votes = await prisma.vote.findMany({
      where: { poll_id: pollId },
      include: {
        user: { select: { city: true } },
      },
    });

    const breakdown: Record<string, Record<number, number>> = {};

    for (const vote of votes) {
      const city = vote.user.city || "Unknown";
      if (!breakdown[city]) {
        breakdown[city] = {};
      }
      breakdown[city][vote.option_index] = (breakdown[city][vote.option_index] || 0) + 1;
    }

    return breakdown;
  }

  async getB2BReport(pollId: string) {
    // Minimum cohort size enforcement
    const MIN_COHORT_SIZE = 10;

    const results = await this.getAggregatedResults(pollId);

    // Filter out cohorts below minimum size
    const filterCohorts = (breakdown: any) => {
      const filtered: any = {};
      for (const [key, values] of Object.entries(breakdown)) {
        const total = Object.values(values as Record<number, number>).reduce((a: number, b: number) => a + b, 0);
        if (total >= MIN_COHORT_SIZE) {
          filtered[key] = values;
        }
      }
      return filtered;
    };

    return {
      ...results,
      age_breakdown: filterCohorts(results.age_breakdown),
      gender_breakdown: filterCohorts(results.gender_breakdown),
      city_breakdown: filterCohorts(results.city_breakdown),
      privacy_note: "Only cohorts with 10+ respondents are included. No individual data is shared.",
    };
  }

  // Platform-wide analytics
  async getPlatformStats() {
    const [totalUsers, totalPolls, totalVotes, totalOpinions] = await Promise.all([
      prisma.user.count({ where: { is_active: true } }),
      prisma.poll.count({ where: { is_active: true } }),
      prisma.vote.count(),
      prisma.opinion.count(),
    ]);

    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [votesLastWeek, opinionslastWeek] = await Promise.all([
      prisma.vote.count({ where: { voted_at: { gte: lastWeek } } }),
      prisma.opinion.count({ where: { created_at: { gte: lastWeek } } }),
    ]);

    return {
      totals: {
        active_users: totalUsers,
        active_polls: totalPolls,
        total_votes: totalVotes,
        total_opinions: totalOpinions,
      },
      weekly_activity: {
        votes_last_week: votesLastWeek,
        opinions_last_week: opinionslastWeek,
      },
      average_engagement: {
        votes_per_poll: totalPolls > 0 ? Math.round(totalVotes / totalPolls) : 0,
        opinions_per_poll: totalPolls > 0 ? Math.round(totalOpinions / totalPolls) : 0,
      },
    };
  }

  async getTopPolls(limit: number = 10) {
    const topPolls = await prisma.poll.findMany({
      where: { is_active: true, status: "ACTIVE" },
      include: {
        _count: { select: { votes: true, opinions: true } },
      },
      orderBy: { _count: { votes: "desc" } },
      take: limit,
    });

    return topPolls.map((poll) => ({
      id: poll.id,
      question: poll.question,
      category: poll.category,
      total_votes: poll._count.votes,
      total_opinions: poll._count.opinions,
      engagement_ratio: poll._count.votes > 0 ? poll._count.opinions / poll._count.votes : 0,
      created_at: poll.created_at,
    }));
  }

  async getUserEngagementStats(userId: string) {
    const [votes, opinions, badges, engagements] = await Promise.all([
      prisma.vote.count({ where: { user_id: userId } }),
      prisma.opinion.count({ where: { user_id: userId } }),
      prisma.userBadge.count({ where: { user_id: userId } }),
      prisma.userEngagement.findMany({
        where: { user_id: userId },
        select: { action: true },
      }),
    ]);

    const actionCounts: Record<string, number> = {};
    engagements.forEach((e) => {
      actionCounts[e.action] = (actionCounts[e.action] || 0) + 1;
    });

    const streak = await prisma.voteStreak.findUnique({
      where: { user_id: userId },
      select: { current_streak: true, longest_streak: true },
    });

    return {
      total_votes: votes,
      total_opinions: opinions,
      badges_earned: badges,
      current_streak: streak?.current_streak || 0,
      longest_streak: streak?.longest_streak || 0,
      actions_breakdown: actionCounts,
    };
  }

  async getCategoryTrends() {
    const categories = await prisma.poll.groupBy({
      by: ["category"],
      where: { status: "ACTIVE", is_active: true },
      _count: { id: true },
    });

    const categoryStats = await Promise.all(
      categories.map(async (cat) => {
        const votes = await prisma.vote.count({
          where: {
            poll: { category: cat.category },
          },
        });
        const opinions = await prisma.opinion.count({
          where: {
            poll: { category: cat.category },
          },
        });
        return {
          category: cat.category,
          active_polls: cat._count.id,
          total_votes: votes,
          total_opinions: opinions,
        };
      })
    );

    return categoryStats.sort((a, b) => b.total_votes - a.total_votes);
  }

  async getRegionalBreakdown() {
    const states = await prisma.user.groupBy({
      by: ["state"],
      where: { is_active: true },
      _count: { id: true },
    });

    const stateStats = await Promise.all(
      states
        .filter((s) => s.state !== null)
        .map(async (state) => {
          const votes = await prisma.vote.count({
            where: {
              user: { state: state.state },
            },
          });
          return {
            state: state.state,
            active_users: state._count.id,
            total_votes: votes,
            avg_votes_per_user: state._count.id > 0 ? Math.round(votes / state._count.id) : 0,
          };
        })
    );

    return stateStats.sort((a, b) => b.total_votes - a.total_votes);
  }

export const analyticsService = new AnalyticsService();
