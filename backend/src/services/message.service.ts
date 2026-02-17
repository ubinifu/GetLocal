import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { NotificationType } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SendMessageData {
  content: string;
}

interface MessageQuery {
  page?: number;
  limit?: number;
}

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
 * Send a message within an order context.
 * Only the customer who placed the order or the store owner can send messages.
 */
export const sendMessage = async (
  orderId: string,
  senderId: string,
  senderRole: string,
  data: SendMessageData
) => {
  // Verify the order exists and the sender has access
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      store: {
        select: {
          id: true,
          name: true,
          ownerId: true,
        },
      },
    },
  });

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  // Verify sender is either the customer or the store owner
  const isCustomer = order.customerId === senderId;
  const isStoreOwner = order.store.ownerId === senderId;

  if (!isCustomer && !isStoreOwner) {
    throw new AppError('You are not authorized to send messages for this order', 403);
  }

  const message = await prisma.message.create({
    data: {
      orderId,
      senderId,
      content: data.content,
    },
    include: {
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
    },
  });

  // Send a notification to the other party
  const recipientId = isCustomer ? order.store.ownerId : order.customerId;
  const senderName = isCustomer ? 'Customer' : order.store.name;

  await prisma.notification.create({
    data: {
      userId: recipientId,
      type: NotificationType.ORDER_STATUS,
      title: `New message for Order #${order.orderNumber}`,
      message: `${senderName} sent you a message: "${data.content.substring(0, 100)}${data.content.length > 100 ? '...' : ''}"`,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        messageId: message.id,
      },
    },
  });

  return message;
};

/**
 * Get paginated messages for an order, sorted oldest first.
 * Only the customer or store owner can view messages.
 */
export const getMessages = async (
  orderId: string,
  userId: string,
  userRole: string,
  query: MessageQuery
): Promise<PaginatedResult<any>> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 50;
  const offset = (page - 1) * limit;

  // Verify the order exists and the user has access
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      store: {
        select: {
          ownerId: true,
        },
      },
    },
  });

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  // Verify the user is authorized to view messages
  const isCustomer = order.customerId === userId;
  const isStoreOwner = order.store.ownerId === userId;
  const isAdmin = userRole === 'ADMIN';

  if (!isCustomer && !isStoreOwner && !isAdmin) {
    throw new AppError('You are not authorized to view messages for this order', 403);
  }

  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where: { orderId },
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    }),
    prisma.message.count({ where: { orderId } }),
  ]);

  return {
    data: messages,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Mark a message as read. Only the recipient (not the sender) can mark it as read.
 */
export const markAsRead = async (messageId: string, userId: string) => {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      order: {
        include: {
          store: {
            select: {
              ownerId: true,
            },
          },
        },
      },
    },
  });

  if (!message) {
    throw new AppError('Message not found', 404);
  }

  // The sender cannot mark their own message as read
  if (message.senderId === userId) {
    throw new AppError('You cannot mark your own message as read', 400);
  }

  // Verify the user is the recipient (customer or store owner)
  const isCustomer = message.order.customerId === userId;
  const isStoreOwner = message.order.store.ownerId === userId;

  if (!isCustomer && !isStoreOwner) {
    throw new AppError('You are not authorized to mark this message as read', 403);
  }

  const updatedMessage = await prisma.message.update({
    where: { id: messageId },
    data: { isRead: true },
    include: {
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
    },
  });

  return updatedMessage;
};
