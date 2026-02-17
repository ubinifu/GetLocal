import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { NotificationType, Prisma } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Create a new notification for a user.
 */
export const createNotification = async (
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  data?: Prisma.InputJsonValue
) => {
  // Verify the user exists
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      data: data ?? Prisma.JsonNull,
    },
  });

  return notification;
};

/**
 * Get paginated notifications for a user, sorted newest first.
 */
export const getNotifications = async (
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResult<any>> => {
  const offset = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.count({ where: { userId } }),
  ]);

  return {
    data: notifications,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Mark a single notification as read. Verifies the notification belongs to the user.
 */
export const markAsRead = async (id: string, userId: string) => {
  const notification = await prisma.notification.findUnique({
    where: { id },
  });

  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  if (notification.userId !== userId) {
    throw new AppError('You are not authorized to update this notification', 403);
  }

  if (notification.isRead) {
    return notification;
  }

  const updatedNotification = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });

  return updatedNotification;
};

/**
 * Mark all notifications as read for a given user.
 */
export const markAllAsRead = async (userId: string) => {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: { isRead: true },
  });

  return { updated: result.count };
};

/**
 * Get the count of unread notifications for a user.
 */
export const getUnreadCount = async (userId: string): Promise<number> => {
  const count = await prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });

  return count;
};
