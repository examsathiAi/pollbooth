import { prisma } from "../../config/database";

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

  async listTopics() {
    return prisma.topic.findMany({
      orderBy: { created_at: "desc" },
    });
  }

  async getTopicBySlug(slug: string) {
    return prisma.topic.findUnique({ where: { slug } });
  }

  async getTopicByName(name: string) {
    return prisma.topic.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });
  }

  async updateTopic(id: string, input: { name?: string; slug?: string; description?: string; parent_category?: string }) {
    return prisma.topic.update({
      where: { id },
      data: input,
    });
  }

  async deleteTopic(id: string) {
    return prisma.topic.delete({ where: { id } });
  }
}

export const topicsService = new TopicsService();
