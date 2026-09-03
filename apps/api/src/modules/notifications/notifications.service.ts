import { PrismaClient } from "@prisma/client";
import { encrypt, decrypt } from "../../common/utils/crypto";
import { getFirebaseApp, isFirebaseInitialized } from "../../config/firebase";
import * as admin from "firebase-admin";

const prisma = new PrismaClient();

export class NotificationsService {
  private flattenDataForFcm(data: Record<string, any>): Record<string, string> {
    const flattened: Record<string, string> = {};

    for (const [key, value] of Object.entries(data ?? {})) {
      if (value === null || value === undefined) continue;

      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        flattened[key] = String(value);
        continue;
      }

      if (Array.isArray(value)) {
        flattened[key] = value.map((item) => String(item)).join(",");
        continue;
      }

      flattened[key] = JSON.stringify(value);
    }

    return flattened;
  }

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
    const notification = await prisma.notification.create({
      data: {
        user_id: userId,
        type,
        title,
        body,
        data,
      },
    });

    try {
      const { io } = require("../../gateway/socket");
      if (io) {
        io.to(`user_${userId}`).emit("new_notification", notification);
      }
    } catch (err) {
      console.warn("[Notifications] Socket broadcast skipped - io not initialized");
    }

    return notification;
  }


  // FCM Token management
  async setFcmToken(userId: string, fcmToken: string) {
    const encryptedToken = encrypt(fcmToken);
    return prisma.user.update({
      where: { id: userId },
      data: { fcm_token: encryptedToken },
    });
  }

  async getFcmToken(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fcm_token: true },
    });
    if (!user?.fcm_token) return null;
    return decrypt(user.fcm_token);
  }

  async removeFcmToken(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { fcm_token: null },
    });
  }

  // Push notification methods (FCM integration)
  async sendPushNotification(userId: string, title: string, body: string, data?: any) {
    // Store in-app notification
    await this.createNotification(userId, "PUSH", title, body, data);

    // Send via FCM if token exists and Firebase is initialized
    if (!isFirebaseInitialized()) {
      console.warn("[Notifications] Firebase not initialized, skipping push notification");
      return;
    }

    const fcmToken = await this.getFcmToken(userId);
    if (!fcmToken) return;

    try {
      const messaging = admin.messaging(getFirebaseApp()!);
      const message = {
        token: fcmToken,
        notification: { title, body },
        data: data ? this.flattenDataForFcm(data) : undefined,
        android: {
          priority: "high" as const,
          notification: {
            channelId: "default",
            sound: "default",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            },
          },
        },
      };
      await messaging.send(message);
      console.log(`[Notifications] Push notification sent to user ${userId}`);
    } catch (error: any) {
      console.error(`[Notifications] Failed to send push notification to user ${userId}:`, error);
      // If token is invalid/unregistered, remove it
      if (error.code === "messaging/invalid-registration-token" || 
          error.code === "messaging/registration-token-not-registered") {
        await this.removeFcmToken(userId);
        console.log(`[Notifications] Removed invalid FCM token for user ${userId}`);
      }
    }
  }

  // Send push notification to multiple users
  async sendPushNotificationToUsers(userIds: string[], title: string, body: string, data?: any) {
    if (!isFirebaseInitialized()) {
      console.warn("[Notifications] Firebase not initialized, skipping push notifications");
      // Still create in-app notifications
      for (const userId of userIds) {
        await this.createNotification(userId, "PUSH", title, body, data);
      }
      return;
    }

    const usersWithTokens = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        fcm_token: { not: null },
        is_active: true,
      },
      select: { id: true, fcm_token: true },
    });

    const messaging = admin.messaging(getFirebaseApp()!);
    const tokens: string[] = [];
    const validUserIds: string[] = [];

    for (const user of usersWithTokens) {
      if (!user.fcm_token) continue;
      const fcmToken = decrypt(user.fcm_token);
      if (fcmToken) {
        tokens.push(fcmToken);
        validUserIds.push(user.id);
      }
    }

    if (tokens.length === 0) {
      // Still create in-app notifications for all users
      for (const userId of userIds) {
        await this.createNotification(userId, "PUSH", title, body, data);
      }
      return;
    }

    try {
      // Send multicast message for efficiency
      const message = {
        tokens,
        notification: { title, body },
        data: data ? this.flattenDataForFcm(data) : undefined,
        android: {
          priority: "high" as const,
          notification: {
            channelId: "default",
            sound: "default",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            },
          },
        },
      };

      const response = await messaging.sendEachForMulticast(message);
      console.log(`[Notifications] Push notifications sent: ${response.successCount} success, ${response.failureCount} failed`);

      // Handle failed tokens
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success && resp.error) {
            const failedUserId = validUserIds[idx];
            const error = resp.error;
            console.error(`[Notifications] Failed to send to user ${failedUserId}:`, error);
            // If token is invalid/unregistered, remove it
            if (error.code === "messaging/invalid-registration-token" || 
                error.code === "messaging/registration-token-not-registered") {
              this.removeFcmToken(failedUserId).catch(console.error);
              console.log(`[Notifications] Removed invalid FCM token for user ${failedUserId}`);
            }
          }
        });
      }

      // Create in-app notifications for all users (including those without tokens)
      for (const userId of userIds) {
        await this.createNotification(userId, "PUSH", title, body, data);
      }
    } catch (error) {
      console.error("[Notifications] Failed to send multicast push notifications:", error);
      // Fallback: create in-app notifications for all users
      for (const userId of userIds) {
        await this.createNotification(userId, "PUSH", title, body, data);
      }
    }
  }

  // Notification triggers for various events
  async notifyOpinionReacted(opinionId: string, actorName: string, reactionType: string) {
    const opinion = await prisma.opinion.findUnique({
      where: { id: opinionId },
      select: { user_id: true, poll_id: true, agree_count: true, disagree_count: true },
    });

    if (!opinion) return;

    const actionWord = reactionType === "AGREE" ? "agreed" : "disagreed";
    const count = reactionType === "AGREE" ? opinion.agree_count : opinion.disagree_count;
    
    let body = `${actorName} ${actionWord} with your opinion.`;
    if (count > 1) {
      body = `${actorName} and ${count - 1} others ${actionWord} with your opinion.`;
    }

    // Facebook Pattern: Find an existing unread notification to aggregate
    const existing = await prisma.notification.findFirst({
      where: {
        user_id: opinion.user_id,
        type: "OPINION_REACTION",
        is_read: false,
        data: { path: ['opinion_id'], equals: opinionId }
      }
    });

    if (existing) {
      // Update existing instead of spamming a new one
      const updated = await prisma.notification.update({
        where: { id: existing.id },
        data: { body, created_at: new Date() }
      });
      
      try {
        const { io } = require("../../gateway/socket");
        if (io) io.to(`user_${opinion.user_id}`).emit("update_notification", updated);
      } catch (err) {}
    } else {
      // Create a fresh notification
      await this.createNotification(
        opinion.user_id,
        "OPINION_REACTION",
        "New reaction",
        body,
        { opinion_id: opinionId, poll_id: opinion.poll_id, reaction_type: reactionType }
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
}

export const notificationsService = new NotificationsService();
