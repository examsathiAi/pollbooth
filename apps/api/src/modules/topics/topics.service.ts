import { prisma } from "../../config/database";

interface ListTopicsFilters {
  parent_category?: string;
  exclude_slug?: string;
  active?: boolean;
  limit?: number;
}

type TopicPollSort = "latest" | "trending" | "most-voted";

export class TopicsService {
  private slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 100);
  }

  private async ensureUniqueSlug(baseSlug: string) {
    const slug = this.slugify(baseSlug) || "topic";
    const existing = await prisma.topic.findUnique({ where: { slug } });
    if (!existing) {
      return slug;
    }

    let suffix = 2;
    let candidate = `${slug}-${suffix}`;
    while (await prisma.topic.findUnique({ where: { slug: candidate } })) {
      suffix += 1;
      candidate = `${slug}-${suffix}`;
    }

    return candidate;
  }

  async createTopic(input: { name: string; slug?: string; description?: string; parent_category?: string }) {
    const slug = input.slug ? this.slugify(input.slug) : this.slugify(input.name);
    const uniqueSlug = await this.ensureUniqueSlug(slug || input.name);

    return prisma.topic.create({
      data: {
        name: input.name,
        slug: uniqueSlug,
        description: input.description,
        parent_category: input.parent_category,
      },
    });
  }

  async listTopics(filters: ListTopicsFilters = {}) {
    const where: any = {};
    if (filters.parent_category) {
      where.parent_category = filters.parent_category;
    }
    if (filters.exclude_slug) {
      where.slug = { not: filters.exclude_slug };
    }
    if (filters.active) {
      where.polls = { some: { is_active: true } };
    }

    return prisma.topic.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: filters.limit,
    });
  }

  async getTopicBySlug(slug: string) {
    return prisma.topic.findUnique({ where: { slug } });
  }

  async getTopicPollsBySlug(slug: string, sort: TopicPollSort, limit = 6) {
    const orderBy: any = [];
    if (sort === "latest") {
      orderBy.push({ created_at: "desc" });
    } else {
      orderBy.push({ votes: { _count: "desc" } });
      if (sort === "trending") {
        orderBy.push({ created_at: "desc" });
      }
    }

    return prisma.poll.findMany({
      where: {
        is_active: true,
        topics: {
          some: { slug },
        },
      },
      orderBy,
      take: limit,
      select: {
        id: true,
        question: true,
        options: true,
        category: true,
        is_commercial: true,
        created_at: true,
        end_date: true,
        _count: {
          select: {
            votes: true,
            opinions: true,
          },
        },
      },
    });
  }

  async updateTopic(id: string, input: { name?: string; slug?: string; description?: string; parent_category?: string }) {
    return prisma.topic.update({
      where: { id },
      data: input,
    });
  }

  async getTopicByName(name: string) {
    return prisma.topic.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });
  }

  async deleteTopic(id: string) {
    return prisma.topic.delete({ where: { id } });
  }

  // Trending topics based on poll activity
  async getTrendingTopics(limit: number = 10) {
    const topics = await prisma.topic.findMany({
      include: {
        polls: {
          where: { is_active: true, status: "ACTIVE" },
          select: {
            id: true,
            _count: { select: { votes: true } },
          },
        },
      },
    });

    const topicsWithStats = topics
      .map((topic) => ({
        id: topic.id,
        name: topic.name,
        slug: topic.slug,
        description: topic.description,
        parent_category: topic.parent_category,
        total_polls: topic.polls.length,
        total_votes: topic.polls.reduce((sum, p) => sum + (p._count?.votes || 0), 0),
        created_at: topic.created_at,
      }))
      .filter((t) => t.total_votes > 0)
      .sort((a, b) => b.total_votes - a.total_votes)
      .slice(0, limit);

    return topicsWithStats;
  }

  // Get related topics based on category
  async getRelatedTopics(topicSlug: string, limit: number = 5) {
    const topic = await prisma.topic.findUnique({ where: { slug: topicSlug } });
    if (!topic) return [];

    return prisma.topic.findMany({
      where: {
        parent_category: topic.parent_category,
        slug: { not: topicSlug },
      },
      take: limit,
    });
  }

  // Get polls by multiple topics (for feed filtering)
  async getPollsByTopics(topicSlugs: string[], limit: number = 10) {
    if (topicSlugs.length === 0) return [];

    return prisma.poll.findMany({
      where: {
        is_active: true,
        status: "ACTIVE",
        topics: {
          some: {
            slug: { in: topicSlugs },
          },
        },
      },
      include: {
        _count: { select: { votes: true, opinions: true } },
        topics: { select: { slug: true, name: true } },
      },
      orderBy: { created_at: "desc" },
      take: limit,
    });
  }
}

export const topicsService = new TopicsService();
