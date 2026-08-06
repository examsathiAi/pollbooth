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
      notifications,
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
}

export const notificationsService = new NotificationsService();
