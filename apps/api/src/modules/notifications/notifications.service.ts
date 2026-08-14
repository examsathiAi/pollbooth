import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class NotificationsService {
  async getNotifications(userId: string, page: number, limit: number) {
    const [notifications, total, unread_count] = await Promise.all([
      prisma.notification.findMany({
        where: { user_id: userId },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where: { user_id: userId } }),
      prisma.notification.count({ where: { user_id: userId, is_read: false } }),
    ]);

    return {
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        is_read: n.is_read,
        data: n.data,
        created_at: n.created_at,
      })),
      unread_count,
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    };
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, user_id: userId },
    });

    if (!notification) {
      throw new Error("Notification not found");
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { is_read: true, read_at: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: { user_id: userId, is_read: false },
      data: { is_read: true, read_at: new Date() },
    });

    return { message: "All notifications marked as read" };
  }

  async createNotification(userId: string, type: string, title: string, body: string, data?: any) {
    return prisma.notification.create({
      data: {
        user_id: userId,
        type,
        title,
        body,
        data,
      },
    });
  }

  // Push notification methods (FCM integration)
  async sendPushNotification(userId: string, title: string, body: string, data?: any) {
    // In production: integrate with Firebase Cloud Messaging
    // Store notification and send via FCM
    await this.createNotification(userId, "PUSH", title, body, data);
  }

  // Notification triggers for various events
  async notifyOpinionReacted(opinionId: string, reactionType: string, agreeCount: number, disagreeCount: number) {
    const opinion = await prisma.opinion.findUnique({
      where: { id: opinionId },
      select: { user_id: true, content: true },
    });

    if (!opinion) return;

    // Notify on milestone reactions
    if (reactionType === "AGREE" && [10, 50, 100].includes(agreeCount)) {
      await this.createNotification(
        opinion.user_id,
        "OPINION_REACTION",
        "Your opinion is getting recognized!",
        `Your opinion reached ${agreeCount} people who agree with you: "${opinion.content.substring(0, 50)}..."`,
        { opinion_id: opinionId, agree_count: agreeCount }
      );
    }
  }

  async notifyOpinionMilestone(opinionId: string, userUsername: string) {
    const opinion = await prisma.opinion.findUnique({
      where: { id: opinionId },
      select: { user_id: true, content: true, poll_id: true },
    });

    if (!opinion) return;

    await this.createNotification(
      opinion.user_id,
      "OPINION_MILESTONE",
      "Your voice is making an impact!",
      `${userUsername} agreed with your opinion`,
      { opinion_id: opinionId, poll_id: opinion.poll_id }
    );
  }

  async notifyNewOpinionOnYourPoll(pollId: string, opinionId: string) {
    // Get poll creator and notify them
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      select: { created_by: true, question: true },
    });

    if (!poll?.created_by) return;

    const opinion = await prisma.opinion.findUnique({
      where: { id: opinionId },
      select: { user: { select: { username: true } } },
    });

    if (!opinion?.user) return;

    await this.createNotification(
      poll.created_by,
      "OPINION_ON_POLL",
      "New response to your poll",
      `${opinion.user.username} shared their opinion on "${poll.question.substring(0, 50)}..."`,
      { poll_id: pollId, opinion_id: opinionId }
    );
  }

  async notifyPollClosed(pollId: string) {
    // Notify all voters that the poll has closed
    const voters = await prisma.vote.findMany({
      where: { poll_id: pollId },
      select: { user_id: true },
      distinct: ["user_id"],
    });

    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      select: { question: true },
    });

    if (!poll) return;

    for (const voter of voters) {
      await this.createNotification(
        voter.user_id,
        "POLL_CLOSED",
        "A poll you voted on has closed",
        `Check the final results for "${poll.question.substring(0, 50)}..."`,
        { poll_id: pollId }
      );
    }
  }

  async notifyBadgeEarned(userId: string, badgeName: string, badgeDescription: string) {
    await this.createNotification(
      userId,
      "BADGE_EARNED",
      `You earned the "${badgeName}" badge!`,
      badgeDescription,
      { badge_name: badgeName }
    );
  }

export const notificationsService = new NotificationsService();
