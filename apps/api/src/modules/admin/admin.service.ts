import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class AdminService {
  async getDashboardStats() {
    const [
      totalUsers,
      activeUsersToday,
      totalVotes,
      totalOpinions,
      pendingModeration,
      totalPolls,
      activePolls,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: { last_active_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
      prisma.vote.count(),
      prisma.opinion.count(),
      prisma.opinion.count({ where: { is_hidden: true, moderation_status: "FLAGGED" } }),
      prisma.poll.count(),
      prisma.poll.count({ where: { is_active: true, status: "ACTIVE" } }),
    ]);

    return {
      users: { total: totalUsers, active_today: activeUsersToday },
      engagement: { total_votes: totalVotes, total_opinions: totalOpinions },
      moderation: { pending_review: pendingModeration },
      polls: { total: totalPolls, active: activePolls },
    };
  }

  async getUsers(query: { page: number; limit: number; search?: string; is_banned?: boolean }) {
    const where: any = {};
    if (query.search) {
      where.OR = [
        { username: { contains: query.search, mode: "insensitive" } },
        { phone_number: { contains: query.search } },
      ];
    }
    if (query.is_banned !== undefined) {
      where.is_banned = query.is_banned;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          profile: true,
          _count: { select: { votes: true, opinions: true } },
        },
        orderBy: { created_at: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users: users.map((u) => ({
        id: u.id,
        username: u.username,
        phone_number: u.phone_number,
        city: u.city,
        state: u.state,
        is_active: u.is_active,
        is_banned: u.is_banned,
        created_at: u.created_at,
        stats: { votes: u._count.votes, opinions: u._count.opinions },
        profile: u.profile,
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        total_pages: Math.ceil(total / query.limit),
      },
    };
  }

  async getQuestionTopicBalance() {
    const categoryCounts = await prisma.poll.groupBy({
      by: ["category"],
      _count: { category: true },
      where: {
        created_at: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });

    return categoryCounts.map((c) => ({
      category: c.category,
      count: c._count.category,
    }));
  }
}

export const adminService = new AdminService();
