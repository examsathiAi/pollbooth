import { PrismaClient } from "@prisma/client";
import { logger } from "../../common/interceptors/logger";
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
    };
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const { username, city, state, ...profileFields } = input;

    // Update user basic info
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

    // Update profile with completion tracking
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

      // Check for Pulse Insider badge
      if (completedPercentage === 100) {
        await this.awardBadgeIfNotExists(userId, "PULSE_INSIDER");
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

    // Return the first missing field with friendly framing
    const fieldGates: Record<string, { field: string; question: string; options: string[] }> = {
      age_bracket: {
        field: "age_bracket",
        question: "Which generation's voice is yours?",
        options: ["GEN_Z (18-24)", "MILLENNIAL (25-40)", "GEN_X (41-56)", "BOOMER (57+)"],
      },
      gender: {
        field: "gender",
        question: "How do you identify?",
        options: ["Male", "Female", "Non-binary", "Prefer not to say"],
      },
      state: {
        field: "state",
        question: "Which state represents you?",
        options: [], // Would be populated from Indian states
      },
      education: {
        field: "education",
        question: "What's your highest qualification?",
        options: ["High School", "Bachelor's", "Master's", "PhD", "Other"],
      },
      income_bracket: {
        field: "income_bracket",
        question: "Which tax slab do you fall under?",
        options: ["< \u20B93L", "\u20B93L-\u20B96L", "\u20B96L-\u20B99L", "\u20B99L-\u20B912L", "\u20B912L-\u20B915L", "> \u20B915L"],
      },
      employment: {
        field: "employment",
        question: "What's your work status?",
        options: ["Employed", "Self-employed", "Student", "Unemployed", "Retired"],
      },
      vehicle: {
        field: "vehicle",
        question: "What do you currently drive?",
        options: ["Two-wheeler", "Hatchback", "Sedan", "SUV", "EV", "None"],
      },
      diet: {
        field: "diet",
        question: "Veg, Non-veg, or Vegan?",
        options: ["Veg", "Non-veg", "Vegan"],
      },
      shopping_pref: {
        field: "shopping_pref",
        question: "Online or offline shopper?",
        options: ["Online", "Offline", "Both"],
      },
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
}

export const usersService = new UsersService();
