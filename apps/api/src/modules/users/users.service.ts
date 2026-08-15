import { PrismaClient } from "@prisma/client";
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
    if (city) userUpdate.city = city;
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

      const allFields = [
        "age_bracket", "gender", "education", "income_bracket",
        "employment", "vehicle", "diet", "shopping_pref",
      ];

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
      age_bracket: { field: "age_bracket", question: "Which generation's voice is yours?", options: ["GEN_Z (18-24)", "MILLENNIAL (25-40)", "GEN_X (41-56)", "BOOMER (57+)"] },
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

  async deleteAccountAndScrubPII(userId: string) {
    // DPDP Right to Erasure: Use a short 11-character mask to safely fit inside strict VarChar(15) database limits
    const uniqueSuffix = Date.now().toString().slice(-8);
    const scrubbedName = `DEL_${uniqueSuffix}`;
    const scrubbedPhone = `+00${uniqueSuffix}`;
    
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          username: scrubbedName,
          phone_number: scrubbedPhone,
          city: null,
          state: null,
          is_active: false,
          avatar_url: null,
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
            shopping_pref: null,
            completed_percentage: 0
          },
        });
      }

      await tx.auditLog.create({
        data: {
          user_id: userId,
          action: "DPDP_RIGHT_TO_ERASURE_EXECUTED",
          entity_type: "USER",
          entity_id: userId,
          metadata: { compliance_standard: "DPDP_2023", scrubbed_at: new Date().toISOString() }
        }
      });
    });
    
    return { ok: true, message: "User PII successfully scrubbed per DPDP mandate." };
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