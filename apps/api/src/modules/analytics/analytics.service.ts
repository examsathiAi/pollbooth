import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class AnalyticsService {
  async getAggregatedResults(pollId: string) {
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        _count: { select: { votes: true } },
      },
    });

    if (!poll) {
      throw new Error("Poll not found");
    }

    // Aggregate by demographics
    const [ageBreakdown, genderBreakdown, cityBreakdown] = await Promise.all([
      this.getDemographicBreakdown(pollId, "age_bracket"),
      this.getDemographicBreakdown(pollId, "gender"),
      this.getCityBreakdown(pollId),
    ]);

    return {
      poll_id: pollId,
      question: poll.question,
      total_votes: poll._count.votes,
      age_breakdown: ageBreakdown,
      gender_breakdown: genderBreakdown,
      city_breakdown: cityBreakdown,
      methodology: {
        sample_size: poll._count.votes,
        region: "India",
        date_range: {
          from: poll.start_date,
          to: poll.end_date || new Date(),
        },
      },
    };
  }

  private async getDemographicBreakdown(pollId: string, field: string) {
    const votes = await prisma.vote.findMany({
      where: { poll_id: pollId },
      include: {
        user: {
          include: { profile: true },
        },
      },
    });

    const breakdown: Record<string, Record<number, number>> = {};

    for (const vote of votes) {
      const value = (vote.user.profile as any)?.[field] || "Unknown";
      if (!breakdown[value]) {
        breakdown[value] = {};
      }
      breakdown[value][vote.option_index] = (breakdown[value][vote.option_index] || 0) + 1;
    }

    return breakdown;
  }

  private async getCityBreakdown(pollId: string) {
    const votes = await prisma.vote.findMany({
      where: { poll_id: pollId },
      include: {
        user: { select: { city: true } },
      },
    });

    const breakdown: Record<string, Record<number, number>> = {};

    for (const vote of votes) {
      const city = vote.user.city || "Unknown";
      if (!breakdown[city]) {
        breakdown[city] = {};
      }
      breakdown[city][vote.option_index] = (breakdown[city][vote.option_index] || 0) + 1;
    }

    return breakdown;
  }

  async getB2BReport(pollId: string) {
    // Minimum cohort size enforcement
    const MIN_COHORT_SIZE = 10;

    const results = await this.getAggregatedResults(pollId);

    // Filter out cohorts below minimum size
    const filterCohorts = (breakdown: any) => {
      const filtered: any = {};
      for (const [key, values] of Object.entries(breakdown)) {
        const total = Object.values(values as Record<number, number>).reduce((a: number, b: number) => a + b, 0);
        if (total >= MIN_COHORT_SIZE) {
          filtered[key] = values;
        }
      }
      return filtered;
    };

    return {
      ...results,
      age_breakdown: filterCohorts(results.age_breakdown),
      gender_breakdown: filterCohorts(results.gender_breakdown),
      city_breakdown: filterCohorts(results.city_breakdown),
      privacy_note: "Only cohorts with 10+ respondents are included. No individual data is shared.",
    };
  }
}

export const analyticsService = new AnalyticsService();
