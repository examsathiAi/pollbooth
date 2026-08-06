import { prisma } from "../../config/database";
import { logger } from "../../common/interceptors/logger";
import type { ReportOpinionInput, ModerateOpinionInput, BanUserInput } from "./moderation.types";

export class ModerationService {
  async reportOpinion(reporterId: string, opinionId: string, input: ReportOpinionInput) {
    const opinion = await prisma.opinion.findUnique({
      where: { id: opinionId },
    });

    if (!opinion) {
      throw new Error("Opinion not found");
    }

    // Check if user already reported this opinion
    const existing = await prisma.report.findFirst({
      where: { opinion_id: opinionId, reporter_id: reporterId },
    });

    if (existing) {
      throw new Error("You have already reported this opinion");
    }

    const report = await prisma.report.create({
      data: {
        opinion_id: opinionId,
        reporter_id: reporterId,
        reason: input.reason,
      },
    });

    // Check if 3 reports reached ? auto-hide
    const reportCount = await prisma.report.count({
      where: { opinion_id: opinionId, status: "PENDING" },
    });

    if (reportCount >= 3) {
      await prisma.opinion.update({
        where: { id: opinionId },
        data: { is_hidden: true, moderation_status: "FLAGGED" },
      });

      logger.warn("Opinion auto-hidden due to reports", { opinionId, reportCount });
    }

    return report;
  }

  async moderateOpinion(adminId: string, opinionId: string, input: ModerateOpinionInput) {
    const opinion = await prisma.opinion.findUnique({
      where: { id: opinionId },
      include: { user: true },
    });

    if (!opinion) {
      throw new Error("Opinion not found");
    }

    if (input.action === "APPROVE") {
      await prisma.opinion.update({
        where: { id: opinionId },
        data: { is_hidden: false, moderation_status: "APPROVED" },
      });

      // Mark reports as resolved
      await prisma.report.updateMany({
        where: { opinion_id: opinionId, status: "PENDING" },
        data: { status: "RESOLVED", reviewed_at: new Date() },
      });
    }

    if (input.action === "REJECT" || input.action === "HIDE") {
      await prisma.opinion.update({
        where: { id: opinionId },
        data: { is_hidden: true, moderation_status: "REJECTED" },
      });

      // Mark reports as resolved
      await prisma.report.updateMany({
        where: { opinion_id: opinionId, status: "PENDING" },
        data: { status: "RESOLVED", reviewed_at: new Date() },
      });

      // Escalate user consequences
      await this.escalateConsequences(opinion.user_id, opinionId, input.reason || "Content rejected by moderator");
    }

    if (input.action === "WARN_USER") {
      await this.escalateConsequences(opinion.user_id, opinionId, input.reason || "Warning from moderator");
    }

    // Log moderation action
    await prisma.moderationAction.create({
      data: {
        user_id: opinion.user_id,
        opinion_id: opinionId,
        action_type: input.action,
        reason: input.reason,
        triggered_by: adminId,
      },
    });

    await prisma.auditLog.create({
      data: {
        user_id: adminId,
        action: "MODERATION_ACTION",
        entity_type: "OPINION",
        entity_id: opinionId,
        ip_address: null,
        user_agent: null,
        metadata: {
          action: input.action,
          reason: input.reason,
          opinion_user_id: opinion.user_id,
        },
      },
    });

    return { message: `Opinion ${input.action.toLowerCase()}d successfully` };
  }

  async escalateConsequences(userId: string, opinionId: string | null, reason: string) {
    let modStatus = await prisma.userModerationStatus.findUnique({
      where: { user_id: userId },
    });

    if (!modStatus) {
      modStatus = await prisma.userModerationStatus.create({
        data: { user_id: userId, warning_count: 0 },
      });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Count warnings in last 30 days
    const recentWarnings = await prisma.moderationAction.count({
      where: {
        user_id: userId,
        action_type: { in: ["REJECT", "WARN_USER", "KEYWORD_FILTER"] },
        created_at: { gte: thirtyDaysAgo },
      },
    });

    let action = "";
    let message = "";

    if (recentWarnings === 0) {
      action = "WARNING";
      message = "Your comment violated community guidelines. Please be respectful.";
    } else if (recentWarnings === 1) {
      action = "WARNING";
      message = "Second warning: Repeated violations will disable your opinion feature.";
    } else if (recentWarnings === 2) {
      action = "7_DAY_BAN";
      const banUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      await prisma.userModerationStatus.update({
        where: { user_id: userId },
        data: {
          warning_count: { increment: 1 },
          last_warning_at: now,
          comment_banned_until: banUntil,
        },
      });
      message = "Your opinion feature is disabled for 7 days. You can still vote.";
    } else if (recentWarnings === 3) {
      action = "30_DAY_BAN";
      const banUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      await prisma.userModerationStatus.update({
        where: { user_id: userId },
        data: {
          warning_count: { increment: 1 },
          last_warning_at: now,
          comment_banned_until: banUntil,
        },
      });
      message = "Your opinion feature is suspended for 30 days.";
    } else {
      action = "PERMANENT_BAN";
      await prisma.userModerationStatus.update({
        where: { user_id: userId },
        data: {
          warning_count: { increment: 1 },
          last_warning_at: now,
          is_permanently_banned: true,
          comment_banned_until: null,
        },
      });
      message = "Permanent restriction on sharing opinions.";
    }

    if (action === "WARNING") {
      await prisma.userModerationStatus.update({
        where: { user_id: userId },
        data: {
          warning_count: { increment: 1 },
          last_warning_at: now,
        },
      });
    }

    // Log the escalation
    await prisma.moderationAction.create({
      data: {
        user_id: userId,
        opinion_id: opinionId,
        action_type: action,
        reason: reason,
        triggered_by: "SYSTEM",
      },
    });

    logger.info(`User moderation escalated: ${action}`, { userId, action, recentWarnings });
    return { action, message };
  }

  async banUser(adminId: string, userId: string, input: BanUserInput) {
    if (input.permanent) {
      await prisma.user.update({
        where: { id: userId },
        data: { is_banned: true, ban_reason: input.reason },
      });

      await prisma.userModerationStatus.upsert({
        where: { user_id: userId },
        create: {
          user_id: userId,
          is_permanently_banned: true,
          ban_reason: input.reason,
        },
        update: {
          is_permanently_banned: true,
          ban_reason: input.reason,
        },
      });

      await prisma.moderationAction.create({
        data: {
          user_id: userId,
          action_type: "PERMANENT_ACCOUNT_BAN",
          reason: input.reason,
          triggered_by: adminId,
        },
      });

      await prisma.auditLog.create({
        data: {
          user_id: adminId,
          action: "PERMANENT_ACCOUNT_BAN",
          entity_type: "USER",
          entity_id: userId,
          ip_address: null,
          user_agent: null,
          metadata: {
            reason: input.reason,
            duration_days: null,
          },
        },
      });

      return { message: "User permanently banned" };
    }

    const banUntil = new Date(Date.now() + (input.duration_days || 7) * 24 * 60 * 60 * 1000);
    await prisma.userModerationStatus.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        comment_banned_until: banUntil,
        ban_reason: input.reason,
      },
      update: {
        comment_banned_until: banUntil,
        ban_reason: input.reason,
      },
    });

    await prisma.auditLog.create({
      data: {
        user_id: adminId,
        action: "TEMPORARY_COMMENT_BAN",
        entity_type: "USER",
        entity_id: userId,
        ip_address: null,
        user_agent: null,
        metadata: {
          reason: input.reason,
          duration_days: input.duration_days || 7,
          banned_until: banUntil.toISOString(),
        },
      },
    });

    return { message: `User banned for ${input.duration_days} days` };
  }

  async getModerationQueue(status: string, page: number, limit: number) {
    const where: any = {};
    if (status !== "ALL") {
      where.moderation_status = status;
    }

    const [opinions, total] = await Promise.all([
      prisma.opinion.findMany({
        where: { ...where, is_hidden: true },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: { id: true, username: true, city: true },
          },
          poll: {
            select: { question: true, category: true },
          },
          _count: {
            select: { reports: true },
          },
        },
      }),
      prisma.opinion.count({ where: { ...where, is_hidden: true } }),
    ]);

    return {
      opinions: opinions.map((op) => ({
        id: op.id,
        content: op.content,
        user: op.user,
        poll: op.poll,
        report_count: op._count.reports,
        created_at: op.created_at,
        moderation_status: op.moderation_status,
      })),
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    };
  }

  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new Error("Cannot block yourself");
    }

    await prisma.userBlock.upsert({
      where: {
        blocker_id_blocked_id: { blocker_id: blockerId, blocked_id: blockedId },
      },
      create: {
        blocker_id: blockerId,
        blocked_id: blockedId,
      },
      update: {},
    });

    return { message: "User blocked successfully" };
  }
}

export const moderationService = new ModerationService();
