import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class PaymentsService {
  async getEarnings(userId: string) {
    const earnings = await prisma.userEarning.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
    });

    const totalEarned = earnings
      .filter((e) => e.status === "COMPLETED")
      .reduce((sum, e) => sum + e.amount, 0);

    const totalPending = earnings
      .filter((e) => e.status === "PENDING")
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      earnings,
      summary: {
        total_earned: totalEarned,
        total_pending: totalPending,
        available_for_withdrawal: totalEarned,
      },
    };
  }

  async requestWithdrawal(userId: string, amount: number, upiId: string) {
    const { summary } = await this.getEarnings(userId);

    if (amount < 100) {
      throw new Error("Minimum withdrawal amount is \u20B9100");
    }

    if (amount > summary.available_for_withdrawal) {
      throw new Error("Insufficient balance");
    }

    // In production: integrate with RazorpayX for UPI payout
    const withdrawal = await prisma.userEarning.create({
      data: {
        user_id: userId,
        source_type: "WITHDRAWAL",
        amount: -amount,
        status: "PENDING",
        metadata: { upi_id: upiId },
      },
    });

    return withdrawal;
  }

  async getSubscription(userId: string) {
    const subscription = await prisma.subscription.findFirst({
      where: {
        user_id: userId,
        status: "ACTIVE",
        expires_at: { gt: new Date() },
      },
      orderBy: { expires_at: "desc" },
    });

    return subscription;
  }

  async createSubscription(userId: string, tier: string, razorpaySubscriptionId: string) {
    const now = new Date();
    const expiresAt = tier === "WEEKLY"
      ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return prisma.subscription.create({
      data: {
        user_id: userId,
        tier,
        razorpay_subscription_id: razorpaySubscriptionId,
        started_at: now,
        expires_at: expiresAt,
      },
    });
  }
}

export const paymentsService = new PaymentsService();
