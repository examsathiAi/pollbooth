import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class BadgesService {
  async getUserBadges(userId: string) {
    const badges = await prisma.userBadge.findMany({
      where: { user_id: userId },
      include: { badge: true },
      orderBy: { earned_at: "desc" },
    });

    return badges.map((ub) => ({
      id: ub.badge.id,
      code: ub.badge.code,
      name: ub.badge.name,
      description: ub.badge.description,
      icon_url: ub.badge.icon_url,
      earned_at: ub.earned_at,
      shared_count: ub.shared_count,
    }));
  }

  async getAllBadges() {
    const badges = await prisma.badge.findMany({
      where: { is_active: true },
      orderBy: { criteria_value: "asc" },
    });

    return badges;
  }

  async getMeBadges(userId: string) {
    const [earned, catalog] = await Promise.all([
      this.getUserBadges(userId),
      this.getAllBadges(),
    ]);

    return {
      earned,
      catalog: catalog.map((badge) => ({
        id: badge.id,
        code: badge.code,
        name: badge.name,
        description: badge.description,
        icon_url: badge.icon_url,
      })),
    };
  }

  async shareBadge(userId: string, badgeId: string) {
    const userBadge = await prisma.userBadge.findFirst({
      where: { user_id: userId, badge_id: badgeId },
    });

    if (!userBadge) {
      throw new Error("Badge not earned yet");
    }

    await prisma.userBadge.update({
      where: { id: userBadge.id },
      data: { shared_count: { increment: 1 } },
    });

    return { message: "Badge shared successfully" };
  }

  // Badge evaluation methods (called by various services)
  async evaluateBadges(userId: string) {
    await this.evaluateVoteBadges(userId);
    await this.evaluateStreakBadges(userId);
    await this.evaluateLocalLeaderBadge(userId);
    await this.evaluateOpinionBadges(userId);
    await this.evaluatePercentileBadges(userId);
  }

  private async evaluateOpinionBadges(userId: string) {
    const totalOpinions = await prisma.opinion.count({ where: { user_id: userId } });
    const agreedOpinions = await prisma.opinion.count({
      where: {
        user_id: userId,
        agree_count: { gte: 10 },
      },
    });

    if (totalOpinions >= 1) {
      await this.awardBadgeIfNotExists(userId, "VOICE_HEARD");
    }
    if (totalOpinions >= 10) {
      await this.awardBadgeIfNotExists(userId, "CONVERSATION_STARTER");
    }
    if (agreedOpinions >= 5) {
      await this.awardBadgeIfNotExists(userId, "POPULAR_VOICE");
    }
  }

  private async evaluatePercentileBadges(userId: string) {
    const allUserVoteCounts = await prisma.user.findMany({
      select: {
        id: true,
        _count: { select: { votes: true } },
      },
    });

    const userVotes = await prisma.vote.count({ where: { user_id: userId } });
    const totalUsers = allUserVoteCounts.length;
    const usersWithMoreVotes = allUserVoteCounts.filter((u) => u._count.votes > userVotes).length;
    const percentile = ((totalUsers - usersWithMoreVotes) / totalUsers) * 100;

    if (percentile >= 90) {
      await this.awardBadgeIfNotExists(userId, "CENTENNIAL_CITIZEN");
    }
    if (percentile >= 75) {
      await this.awardBadgeIfNotExists(userId, "TOP_VOTER");
    }
  }

  private async evaluateVoteBadges(userId: string) {
    const totalVotes = await prisma.vote.count({ where: { user_id: userId } });
    const user = await prisma.user.findUnique({ 
      where: { id: userId }, 
      include: { profile: true } 
    });

    // Milestone badges for votes
    if (totalVotes >= 1) {
      await this.awardBadgeIfNotExists(userId, "FIRST_VOTE");
    }
    if (totalVotes >= 10) {
      await this.awardBadgeIfNotExists(userId, "VOICE_RISING");
    }
    if (totalVotes >= 50) {
      await this.awardBadgeIfNotExists(userId, "CIVIC_CHAMPION");
    }
    if (totalVotes >= 100) {
      await this.awardBadgeIfNotExists(userId, "CENTURY_VOICE");
      if (user?.profile?.age_bracket === "GEN_Z") {
        await this.awardBadgeIfNotExists(userId, "VOICE_OF_GEN_Z");
      }
    }
    if (totalVotes >= 250) {
      await this.awardBadgeIfNotExists(userId, "OPINION_TITAN");
    }
  }

  private async evaluateStreakBadges(userId: string) {
    const streak = await prisma.voteStreak.findUnique({ where: { user_id: userId } });
    const currentStreak = streak?.current_streak ?? 0;

    if (currentStreak >= 7) {
      await this.awardBadgeIfNotExists(userId, "CONSISTENT_VOICE");
    }
    if (currentStreak >= 30) {
      await this.awardBadgeIfNotExists(userId, "PULSE_PATRIOT");
    }
  }

  private async evaluateLocalLeaderBadge(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { city: true },
    });

    if (!user?.city) return;

    // Find top voter in city this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const cityVoters = await prisma.vote.groupBy({
      by: ["user_id"],
      where: {
        user: { city: user.city },
        voted_at: { gte: startOfMonth },
      },
      _count: { user_id: true },
      orderBy: { _count: { user_id: "desc" } },
      take: 1,
    });

    if (cityVoters[0]?.user_id === userId) {
      await this.awardBadgeIfNotExists(userId, "LOCAL_LEADER");
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

  // Badge leaderboards
  async getBadgeLeaderboard(badgeCode: string, limit: number = 10) {
    const badge = await prisma.badge.findUnique({ where: { code: badgeCode } });
    if (!badge) {
      throw new Error("Badge not found");
    }

    const leaders = await prisma.userBadge.findMany({
      where: { badge_id: badge.id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar_url: true,
            city: true,
            _count: { select: { votes: true, opinions: true } },
          },
        },
      },
      orderBy: { earned_at: "asc" },
      take: limit,
    });

    return leaders.map((ub) => ({
      badge_id: badge.id,
      badge_name: badge.name,
      user_id: ub.user.id,
      username: ub.user.username,
      avatar_url: ub.user.avatar_url,
      city: ub.user.city,
      earned_at: ub.earned_at,
      shared_count: ub.shared_count,
      stats: {
        total_votes: ub.user._count.votes,
        total_opinions: ub.user._count.opinions,
      },
    }));
  }

  async getTopBadges(limit: number = 20) {
    const badges = await prisma.badge.findMany({
      where: { is_active: true },
      include: {
        _count: { select: { user_badges: true } },
      },
      orderBy: { _count: { user_badges: "desc" } },
      take: limit,
    });

    return badges.map((badge) => ({
      id: badge.id,
      code: badge.code,
      name: badge.name,
      description: badge.description,
      icon_url: badge.icon_url,
      total_earned: badge._count.user_badges,
    }));
  }

export const badgesService = new BadgesService();
