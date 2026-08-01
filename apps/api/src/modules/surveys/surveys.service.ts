import { PrismaClient } from "@prisma/client";
import type { CreateSurveySuggestionInput } from "./surveys.types";

const prisma = new PrismaClient();

export class SurveysService {
  async createSuggestion(userId: string, input: CreateSurveySuggestionInput) {
    const suggestion = await prisma.surveySuggestion.create({
      data: {
        user_id: userId,
        category: input.category,
        question_text: input.question_text,
        context: input.context,
        target_region: input.target_region,
        status: "PENDING",
      },
    });

    return suggestion;
  }

  async getSuggestions(status?: string, page: number = 1, limit: number = 20) {
    const where: any = {};
    if (status && status !== "ALL") where.status = status;

    const [suggestions, total] = await Promise.all([
      prisma.surveySuggestion.findMany({
        where,
        include: {
          user: {
            select: { username: true, city: true, profile: { select: { completed_percentage: true } } },
          },
        },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.surveySuggestion.count({ where }),
    ]);

    return {
      suggestions: suggestions.map((s) => ({
        ...s,
        user_profile_completeness: s.user?.profile?.completed_percentage || 0,
      })),
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    };
  }

  async approveSuggestion(adminId: string, suggestionId: string, pollData: any) {
    const suggestion = await prisma.surveySuggestion.findUnique({
      where: { id: suggestionId },
    });

    if (!suggestion) {
      throw new Error("Suggestion not found");
    }

    // Create poll from suggestion
    const poll = await prisma.poll.create({
      data: {
        question: suggestion.question_text,
        options: pollData.options,
        category: suggestion.category,
        target_filters: this.buildTargetFilters(suggestion.target_region, suggestion.user_id),
        status: "ACTIVE",
        is_active: true,
        created_by: adminId,
      },
    });

    await prisma.surveySuggestion.update({
      where: { id: suggestionId },
      data: { status: "APPROVED", reviewed_at: new Date() },
    });

    // Award Community Curator badge
    await this.awardCommunityCurator(suggestion.user_id);

    return { suggestion, poll };
  }

  async rejectSuggestion(suggestionId: string, adminNotes?: string) {
    return prisma.surveySuggestion.update({
      where: { id: suggestionId },
      data: { status: "REJECTED", admin_notes: adminNotes, reviewed_at: new Date() },
    });
  }

  private buildTargetFilters(region?: string | null, userId?: string | null): any {
    // In production, look up user's city/state
    if (!region || !userId) {
      return {};
    }

    return {};
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

export const surveysService = new SurveysService();
