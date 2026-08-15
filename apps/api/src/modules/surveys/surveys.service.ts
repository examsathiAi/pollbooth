import { PrismaClient } from "@prisma/client";
import type { CreateSurveySuggestionInput } from "./surveys.types";
import { notificationsService } from "../notifications/notifications.service";

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

    await notificationsService.createNotification(
      userId,
      "SUGGESTION_RECEIVED",
      "Suggestion received",
      "Thanks for your idea â€” weâ€™ve received your poll suggestion and will notify you when the team reviews it.",
      { suggestion_id: suggestion.id, category: suggestion.category }
    );

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

    await notificationsService.createNotification(
      suggestion.user_id,
      "SUGGESTION_APPROVED",
      "Your poll suggestion is live",
      "Great news! Your suggested poll has been approved and is now live for voting.",
      { suggestion_id: suggestion.id, poll_id: poll.id, category: suggestion.category }
    );

    // Award Community Curator badge
    await this.awardCommunityCurator(suggestion.user_id);

    return { suggestion, poll };
  }

  async rejectSuggestion(suggestionId: string, adminNotes?: string) {
    const suggestion = await prisma.surveySuggestion.findUnique({ where: { id: suggestionId } });
    if (!suggestion) {
      throw new Error("Suggestion not found");
    }

    const result = await prisma.surveySuggestion.update({
      where: { id: suggestionId },
      data: { status: "REJECTED", admin_notes: adminNotes, reviewed_at: new Date() },
    });

    await notificationsService.createNotification(
      suggestion.user_id,
      "SUGGESTION_REJECTED",
      "Suggestion review finished",
      `Your poll suggestion was reviewed${adminNotes ? `: ${adminNotes}` : "."} We appreciate your input and welcome more ideas.`,
      { suggestion_id: suggestion.id, category: suggestion.category }
    );

    return result;
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

  // --- B2B PARTNER SURVEYS ---
  async getAvailableSurveys(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    });
    
    if (!user) throw new Error("User not found");

    const profileCompleteness = user.profile?.completed_percentage || 0;

    // Find active surveys that need samples
    const allActiveSurveys = await prisma.partnerSurvey.findMany({
      where: {
        is_active: true,
        OR: [
          { end_date: null },
          { end_date: { gt: new Date() } }
        ]
      },
      orderBy: { incentive_amount: 'desc' } // Show highest paying first
    });

    // Get surveys user has already consented to/completed
    const userConsents = await prisma.surveyConsent.findMany({
      where: { user_id: userId }
    });
    const takenSurveyIds = userConsents.map(c => c.survey_id);

    // Filter out taken surveys and ones that reached sample limit
    const availableSurveys = allActiveSurveys.filter(survey => 
      !takenSurveyIds.includes(survey.id) && 
      survey.sample_size_completed < survey.sample_size_needed
    );

    return {
      surveys: availableSurveys,
      profile_completeness: profileCompleteness,
      needs_profile_completion: profileCompleteness < 100 && availableSurveys.length > 0
    };
  }

  async consentToSurvey(userId: string, surveyId: string) {
    const survey = await prisma.partnerSurvey.findUnique({ where: { id: surveyId }});
    if (!survey || !survey.is_active) throw new Error("Survey not available");
    if (survey.sample_size_completed >= survey.sample_size_needed) throw new Error("Survey sample limit reached");

    const consent = await prisma.surveyConsent.create({
      data: {
        user_id: userId,
        survey_id: surveyId,
        partner_name: survey.partner_name,
        is_active: true
      }
    });

    return { consent, redirect_url: survey.survey_url };
  }
}