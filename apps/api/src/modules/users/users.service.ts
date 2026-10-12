
function getCityTier(city: string | undefined | null): string | undefined {
  if (!city) return undefined;
  const c = city.toLowerCase().trim();
  const tier1 = ['mumbai', 'delhi', 'new delhi', 'bengaluru', 'bangalore', 'chennai', 'hyderabad', 'kolkata', 'ahmedabad', 'pune'];
  const tier2 = ['ranchi', 'patna', 'jaipur', 'lucknow', 'kanpur', 'nagpur', 'indore', 'bhopal', 'visakhapatnam', 'vadodara', 'ludhiana', 'agra', 'nashik', 'faridabad', 'meerut', 'rajkot', 'varanasi', 'srinagar', 'aurangabad', 'dhanbad', 'amritsar', 'allahabad', 'howrah', 'gwalior', 'jabalpur', 'coimbatore', 'vijayawada', 'jodhpur', 'madurai', 'raipur', 'kota', 'guwahati', 'chandigarh', 'thiruvananthapuram', 'mysore', 'gurgaon', 'noida', 'jamshedpur', 'dehradun', 'kochi', 'bhubaneswar', 'mangalore'];
  if (tier1.includes(c)) return 'TIER_1';
  if (tier2.includes(c)) return 'TIER_2';
  return 'TIER_3'; 
}

﻿import { PrismaClient } from "@prisma/client";
import type { UpdateProfileInput } from "./users.types";

const prisma = new PrismaClient();

export class UsersService {
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        badges: {
          include: { badge: true },
          orderBy: { earned_at: "desc" },
        },
        _count: {
          select: {
            votes: true,
            opinions: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const streak = await prisma.voteStreak.findUnique({
      where: { user_id: userId },
    });

    const moderationStatus = await prisma.userModerationStatus.findUnique({
      where: { user_id: userId },
    });

    return {
      id: user.id,
      username: user.username,
      city: user.city,
      state: user.state,
      avatar_url: user.avatar_url,
      profile: user.profile,
      badges: user.badges.map((ub) => ({
        id: ub.badge.id,
        code: ub.badge.code,
        name: ub.badge.name,
        earned_at: ub.earned_at,
      })),
      stats: {
        total_votes: user._count.votes,
        total_opinions: user._count.opinions,
        current_streak: streak?.current_streak || 0,
        longest_streak: streak?.longest_streak || 0,
      },
      moderation: {
        comment_banned_until: moderationStatus?.comment_banned_until ?? null,
        is_permanently_banned: moderationStatus?.is_permanently_banned ?? false,
      },
    };
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const { username, city, state, ...profileFields } = input;

    const userUpdate: any = {};
    if (username) userUpdate.username = username;
    if (city) { userUpdate.city = city; userUpdate.city_tier = getCityTier(city); }
    if (state) userUpdate.state = state;

    if (Object.keys(userUpdate).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: userUpdate,
      });
    }

    if (Object.keys(profileFields).length > 0) {
      const currentProfile = await prisma.profile.findUnique({
        where: { user_id: userId },
      });

      const allFields = ["age_bracket", "gender", "education", "income_bracket", "employment", "vehicle", "diet", "shopping_pref", "streaming_platforms"];

      const filledFields = allFields.filter((field) => {
        const val = (profileFields as any)[field] || (currentProfile as any)?.[field];
        return val !== null && val !== undefined;
      });

      const completedPercentage = Math.round((filledFields.length / allFields.length) * 100);

      await prisma.profile.update({
        where: { user_id: userId },
        data: {
          ...profileFields,
          completed_percentage: completedPercentage,
        },
      });

      if (completedPercentage === 100) {
        await this.awardBadgeIfNotExists(userId, "POLLBOOTH_INSIDER");
      }
    }

    return this.getProfile(userId);
  }

  async getProgressiveProfileGate(userId: string, category: string) {
    const profile = await prisma.profile.findUnique({
      where: { user_id: userId },
    });

    const categoryFieldMap: Record<string, string[]> = {
      POLITICS: ["age_bracket"],
      NEWS: ["age_bracket"],
      EDUCATION: ["age_bracket"],
      BOLLYWOOD: ["gender"],
      LIFESTYLE: ["gender"],
      FASHION: ["gender"],
      REGIONAL: ["state"],
      CIVIC: ["state"],
      POLICY: ["education"],
      JOBS: ["education"],
      ECONOMY: ["education", "employment"],
      TAX: ["income_bracket"],
      BUDGET: ["income_bracket"],
      REAL_ESTATE: ["income_bracket"],
      STARTUPS: ["employment"],
      WORK_CULTURE: ["employment"],
      AUTO: ["vehicle"],
      EV: ["vehicle"],
      TRANSPORT: ["vehicle"],
      FOOD: ["diet"],
      FMCG: ["diet"],
      HEALTH: ["diet"],
      E_COMMERCE: ["shopping_pref"],
      RETAIL: ["shopping_pref"],
    };

    const requiredFields = categoryFieldMap[category] || [];
    const missingFields = requiredFields.filter((field) => !(profile as any)?.[field]);

    if (missingFields.length === 0) {
      return { required: false };
    }

    const fieldGates: Record<string, { field: string; question: string; options: string[] }> = {
      age_bracket: { field: "age_bracket", question: "Which generation's voice is yours?", options: ["GEN_ALPHA", "GEN_Z", "MILLENNIAL", "GEN_X", "BOOMER", "PREFER_NOT_TO_SAY"] },
      gender: { field: "gender", question: "How do you identify?", options: ["Male", "Female", "Non-binary", "Prefer not to say"] },
      state: { field: "state", question: "Which state represents you?", options: [] },
      education: { field: "education", question: "What's your highest qualification?", options: ["High School", "Bachelor's", "Master's", "PhD", "Other"] },
      income_bracket: { field: "income_bracket", question: "Which tax slab do you fall under?", options: ["< â‚¹3L", "â‚¹3L-â‚¹6L", "â‚¹6L-â‚¹9L", "â‚¹9L-â‚¹12L", "â‚¹12L-â‚¹15L", "> â‚¹15L"] },
      employment: { field: "employment", question: "What's your work status?", options: ["Employed", "Self-employed", "Student", "Unemployed", "Retired"] },
      vehicle: { field: "vehicle", question: "What do you currently drive?", options: ["Two-wheeler", "Hatchback", "Sedan", "SUV", "EV", "None"] },
      diet: { field: "diet", question: "Veg, Non-veg, or Vegan?", options: ["Veg", "Non-veg", "Vegan"] },
      shopping_pref: { field: "shopping_pref", question: "Online or offline shopper?", options: ["Online", "Offline", "Both"] },
    };

    return {
      required: true,
      gate: fieldGates[missingFields[0]],
    };
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

  // DPDP Right to Erasure: removes personal identity, comment text, notifications and tokens.
  // Votes stay only as anonymous counts. Earnings records stay (financial record).
  async deleteAccountAndScrubPII(userId: string) {
    const suffix = Date.now().toString().slice(-8);
    const scrubbedName = `DEL_${userId.replace(/-/g, "").slice(0, 12)}`;
    const scrubbedPhone = `+00${suffix}`;

    const result = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          username: scrubbedName,
          name: "Deleted user",
          phone_number: scrubbedPhone,
          phone_hash: `del_${userId}`,
          email: null,
          google_id: null,
          fcm_token: null,
          referral_code: null,
          city: null,
          state: null,
          city_tier: null,
          is_active: false,
          avatar_url: null,
          deleted_at: new Date(),
        },
      });

      const profile = await tx.profile.findUnique({ where: { user_id: userId } });
      if (profile) {
        await tx.profile.update({
          where: { user_id: userId },
          data: {
            age_bracket: null,
            gender: null,
            education: null,
            income_bracket: null,
            employment: null,
            vehicle: null,
            diet: null,
            streaming_platforms: [],
            shopping_pref: null,
            completed_percentage: 0,
          },
        });
      }

      const comments = await tx.opinion.updateMany({
        where: { user_id: userId },
        data: { content: "[comment removed by user]", is_hidden: true },
      });
      const notes = await tx.notification.deleteMany({ where: { user_id: userId } });
      await tx.surveyConsent.updateMany({
        where: { user_id: userId },
        data: { ip_address: null, user_agent: null, is_active: false, revoked_at: new Date() },
      });

      await tx.auditLog.create({
        data: {
          user_id: userId,
          action: "DPDP_RIGHT_TO_ERASURE_EXECUTED",
          entity_type: "USER",
          entity_id: userId,
          metadata: {
            compliance_standard: "DPDP_2023",
            scrubbed_at: new Date().toISOString(),
            comments_removed: comments.count,
            notifications_deleted: notes.count,
          },
        },
      });
      return { comments: comments.count };
    });

    return { ok: true, message: "Your personal data has been erased.", comments_removed: result.comments };
  }

  // DPDP Right to Access: everything we hold about this member, as one file.
  async exportMyData(userId: string) {
    const [user, votes, opinions, earnings, consents] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, username: true, name: true, email: true, phone_number: true,
          city: true, state: true, city_tier: true, referral_code: true, created_at: true,
          profile: true,
        },
      }),
      prisma.vote.findMany({
        where: { user_id: userId },
        orderBy: { voted_at: "desc" },
        select: { option_index: true, voted_at: true, poll: { select: { id: true, question: true, options: true } } },
      }),
      prisma.opinion.findMany({
        where: { user_id: userId },
        orderBy: { created_at: "desc" },
        select: { content: true, created_at: true, moderation_status: true, is_hidden: true, poll: { select: { id: true, question: true } } },
      }),
      prisma.userEarning.findMany({
        where: { user_id: userId },
        orderBy: { created_at: "desc" },
        select: { source_type: true, amount: true, status: true, created_at: true },
      }),
      prisma.surveyConsent.findMany({
        where: { user_id: userId },
        select: { partner_name: true, consented_at: true, revoked_at: true, is_completed: true },
      }),
    ]);

    return {
      exported_at: new Date().toISOString(),
      note: "This file contains the personal data PollBooth holds about you.",
      account: user,
      votes: votes.map((v) => {
        const opts = v.poll.options as unknown as string[];
        return {
          poll: v.poll.question,
          poll_id: v.poll.id,
          your_choice: Array.isArray(opts) ? opts[v.option_index] ?? null : null,
          voted_at: v.voted_at,
        };
      }),
      comments: opinions.map((o) => ({
        poll: o.poll.question,
        poll_id: o.poll.id,
        comment: o.content,
        posted_at: o.created_at,
        status: o.is_hidden ? "hidden" : o.moderation_status,
      })),
      earnings,
      partner_consents: consents,
    };
  }

  async getMyOpinions(userId: string) {
    const rows = await prisma.opinion.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      take: 100,
      select: {
        id: true, content: true, created_at: true, is_hidden: true, moderation_status: true,
        poll: { select: { id: true, question: true } },
      },
    });
    return { opinions: rows };
  }

  // --- REFERRAL ENGINE ---
  async getReferralStats(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referral_code: true }
    });

    if (!user) throw new Error("User not found");

    let refCode = user.referral_code;
    if (!refCode) {
      // Generate a unique 8-character referral code on the fly
      refCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      await prisma.user.update({
        where: { id: userId },
        data: { referral_code: refCode }
      });
    }

    const totalReferred = await prisma.user.count({
      where: { referred_by: userId }
    });

    const earnings = await prisma.userEarning.findMany({
      where: { user_id: userId, source_type: 'REFERRAL' },
      orderBy: { created_at: 'desc' }
    });

    const totalEarned = earnings.reduce((sum, e) => sum + e.amount, 0);

    return {
      referral_code: refCode,
      total_referred: totalReferred,
      total_earned: totalEarned,
      history: earnings
    };
  }
}

export const usersService = new UsersService();