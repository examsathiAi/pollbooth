import { PrismaClient } from "@prisma/client";
import type { CreateCivicIssueInput } from "./civic.types";

const prisma = new PrismaClient();

export class CivicService {
  async createIssue(userId: string, input: CreateCivicIssueInput) {
    const issue = await prisma.civicIssue.create({
      data: {
        user_id: userId,
        title: input.title,
        description: input.description,
        city: input.city,
        state: input.state,
        category: input.category,
        status: "PENDING",
      },
    });

    return issue;
  }

  async getIssues(city?: string, state?: string, status?: string, page: number = 1, limit: number = 20) {
    const where: any = {};
    if (city) where.city = city;
    if (state) where.state = state;
    if (status && status !== "ALL") where.status = status;

    const [issues, total] = await Promise.all([
      prisma.civicIssue.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.civicIssue.count({ where }),
    ]);

    return {
      issues,
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    };
  }

  async convertToPoll(adminId: string, issueId: string, pollData: any) {
    const issue = await prisma.civicIssue.findUnique({
      where: { id: issueId },
    });

    if (!issue) {
      throw new Error("Issue not found");
    }

    // Create poll from issue
    const poll = await prisma.poll.create({
      data: {
        question: issue.title,
        options: pollData.options,
        category: "CIVIC",
        sub_category: issue.category,
        target_filters: {
          cities: [issue.city],
          states: [issue.state],
        },
        status: "ACTIVE",
        is_active: true,
        created_by: adminId,
      },
    });

    // Update issue
    await prisma.civicIssue.update({
      where: { id: issueId },
      data: { status: "CONVERTED", poll_id: poll.id },
    });

    // Award Community Curator badge
    await this.awardCommunityCurator(issue.user_id);

    return { issue, poll };
  }

  private async awardCommunityCurator(userId: string) {
    const badge = await prisma.badge.findUnique({ where: { code: "COMMUNITY_CURATOR" } });
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

export const civicService = new CivicService();
