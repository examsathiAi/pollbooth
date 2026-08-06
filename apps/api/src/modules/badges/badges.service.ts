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
  }

  private async evaluateVoteBadges(userId: string) {
    const totalVotes = await prisma.vote.count({ where: { user_id: userId } });

    if (totalVotes >= 100) {
      const profile = await prisma.profile.findUnique({ where: { user_id: userId } });
      if (profile?.age_bracket === "GEN_Z") {
        await this.awardBadgeIfNotExists(userId, "VOICE_OF_GEN_Z");
      }
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
}

export const badgesService = new BadgesService();
