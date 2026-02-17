import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { OrderStatus, NotificationType, Prisma, PromotionType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { validateCouponCode, calculateDiscount } from './promotion.service';

// ─── Constants ────────────────────────────────────────────────────────────────

const TAX_RATE = 0.085; // 8.5%

/**
 * Valid status transitions for orders.
 * Key = current status, Value = set of valid next statuses.
 */
const VALID_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
  [OrderStatus.READY]: [OrderStatus.PICKED_UP, OrderStatus.CANCELLED],
  [OrderStatus.PICKED_UP]: [],
  [OrderStatus.CANCELLED]: [],
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreateOrderData {
  storeId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  pickupTime?: string;
  notes?: string;
}

interface OrderQuery {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  storeId?: string;
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

interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersByStatus: Record<string, number>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate a unique, human-readable order number.
 */
const generateOrderNumber = (): string => {
  const prefix = 'GL';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = uuidv4().split('-')[0].toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Create a new order.
 *
 * Validates all products exist and belong to the same store, checks stock
 * availability, calculates totals with tax, creates the order with items,
 * decrements stock, and sends a notification to the store owner.
 */
export const createOrder = async (customerId: string, data: CreateOrderData) => {
  if (!data.items || data.items.length === 0) {
    throw new AppError('Order must contain at least one item', 400);
  }

  // Verify the store exists and is active
  const store = await prisma.store.findUnique({
    where: { id: data.storeId },
  });

  if (!store) {
    throw new AppError('Store not found', 404);
  }

  if (!store.isActive) {
    throw new AppError('This store is currently not accepting orders', 400);
  }

  // Fetch all requested products
  const productIds = data.items.map((item) => item.productId);
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      isActive: true,
    },
  });

  // Validate all products were found
  if (products.length !== productIds.length) {
    const foundIds = new Set(products.map((p) => p.id));
    const missingIds = productIds.filter((id) => !foundIds.has(id));
    throw new AppError(
      `The following products were not found or are inactive: ${missingIds.join(', ')}`,
      404
    );
  }

  // Validate all products belong to the same store
  const invalidProducts = products.filter((p) => p.storeId !== data.storeId);
  if (invalidProducts.length > 0) {
    throw new AppError('All products must belong to the specified store', 400);
  }

  // Build a map for quick lookup
  const productMap = new Map(products.map((p) => [p.id, p]));

  // Validate stock and calculate totals
  let subtotal = new Prisma.Decimal(0);
  const orderItems: Array<{
    productId: string;
    quantity: number;
    unitPrice: Prisma.Decimal;
    totalPrice: Prisma.Decimal;
  }> = [];

  for (const item of data.items) {
    const product = productMap.get(item.productId)!;

    if (item.quantity <= 0) {
      throw new AppError(`Quantity for ${product.name} must be greater than zero`, 400);
    }

    if (product.stockQuantity < item.quantity) {
      throw new AppError(
        `Insufficient stock for ${product.name}. Available: ${product.stockQuantity}, Requested: ${item.quantity}`,
        400
      );
    }

    const unitPrice = product.price;
    const totalPrice = product.price.mul(item.quantity);

    subtotal = subtotal.add(totalPrice);

    orderItems.push({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice,
      totalPrice,
    });
  }

  const tax = subtotal.mul(TAX_RATE).toDecimalPlaces(2);
  const total = subtotal.add(tax);

  // Create the order and decrement stock in a single transaction
  const order = await prisma.$transaction(async (tx) => {
    // Create the order
    const newOrder = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        customerId,
        storeId: data.storeId,
        status: OrderStatus.PENDING,
        subtotal,
        tax,
        total,
        pickupTime: data.pickupTime ? new Date(data.pickupTime) : null,
        notes: data.notes ?? null,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
              },
            },
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
          },
        },
      },
    });

    // Decrement stock for each product
    for (const item of data.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stockQuantity: { decrement: item.quantity },
        },
      });
    }

    return newOrder;
  });

  // Create a notification for the store owner (outside transaction for non-critical path)
  await prisma.notification.create({
    data: {
      userId: store.ownerId,
      type: NotificationType.ORDER_STATUS,
      title: 'New Order Received',
      message: `You have received a new order #${order.orderNumber} totaling $${total.toFixed(2)}.`,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        total: total.toNumber(),
      },
    },
  });

  // Check and create LOW_STOCK notifications for products that dropped below threshold
  for (const item of data.items) {
    const product = productMap.get(item.productId)!;
    const newStock = product.stockQuantity - item.quantity;

    if (newStock <= product.lowStockThreshold) {
      await prisma.notification.create({
        data: {
          userId: store.ownerId,
          type: NotificationType.LOW_STOCK,
          title: 'Low Stock Alert',
          message: `${product.name} has only ${newStock} units remaining.`,
          data: {
            productId: product.id,
            storeId: store.id,
            productName: product.name,
            currentStock: newStock,
            threshold: product.lowStockThreshold,
          },
        },
      });
    }
  }

  return order;
};

/**
 * Get an order by ID. Verifies access based on user role.
 * Customers can only see their own orders. Store owners can see orders for their stores.
 */
export const getOrderById = async (id: string, userId: string, userRole: string) => {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              description: true,
              imageUrl: true,
              sku: true,
            },
          },
        },
      },
      store: {
        select: {
          id: true,
          name: true,
          address: true,
          city: true,
          state: true,
          phone: true,
          ownerId: true,
        },
      },
      customer: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
    },
  });

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  // Verify access
  if (userRole === 'ADMIN') {
    // Admin can see all orders
  } else if (userRole === 'CUSTOMER' && order.customerId !== userId) {
    throw new AppError('You are not authorized to view this order', 403);
  } else if (userRole === 'STORE_OWNER' && order.store.ownerId !== userId) {
    throw new AppError('You are not authorized to view this order', 403);
  }

  return order;
};

/**
 * Get orders for a customer or store owner with filtering and pagination.
 */
export const getOrders = async (
  userId: string,
  userRole: string,
  query: OrderQuery
): Promise<PaginatedResult<any>> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const offset = (page - 1) * limit;

  const where: Prisma.OrderWhereInput = {};

  if (userRole === 'CUSTOMER') {
    where.customerId = userId;
  } else if (userRole === 'STORE_OWNER') {
    where.store = { ownerId: userId };
    if (query.storeId) {
      where.storeId = query.storeId;
    }
  } else if (userRole === 'ADMIN') {
    // Admin can see all orders
    if (query.storeId) {
      where.storeId = query.storeId;
    }
  }

  if (query.status) {
    where.status = query.status;
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
              },
            },
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    data: orders,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Update the status of an order. Validates the status transition and
 * verifies that the store owner is authorized.
 */
export const updateOrderStatus = async (
  orderId: string,
  userId: string,
  newStatus: OrderStatus
) => {
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

  // Verify store ownership
  if (order.store.ownerId !== userId) {
    throw new AppError('You are not authorized to update this order', 403);
  }

  // Validate status transition
  const allowedTransitions = VALID_STATUS_TRANSITIONS[order.status];

  if (!allowedTransitions.includes(newStatus)) {
    throw new AppError(
      `Cannot transition order from ${order.status} to ${newStatus}. Allowed transitions: ${
        allowedTransitions.length > 0 ? allowedTransitions.join(', ') : 'none (terminal state)'
      }`,
      400
    );
  }

  // Update the order status
  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: { status: newStatus },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
            },
          },
        },
      },
      store: {
        select: {
          id: true,
          name: true,
          address: true,
        },
      },
    },
  });

  // Build a customer-facing status message
  const statusMessages: Record<OrderStatus, string> = {
    [OrderStatus.PENDING]: 'Your order is pending.',
    [OrderStatus.CONFIRMED]: 'Your order has been confirmed by the store.',
    [OrderStatus.PREPARING]: 'Your order is now being prepared.',
    [OrderStatus.READY]: 'Your order is ready for pickup!',
    [OrderStatus.PICKED_UP]: 'Your order has been picked up. Thank you!',
    [OrderStatus.CANCELLED]: 'Your order has been cancelled.',
  };

  // Create notification for the customer
  await prisma.notification.create({
    data: {
      userId: order.customerId,
      type: NotificationType.ORDER_STATUS,
      title: `Order #${order.orderNumber} Updated`,
      message: statusMessages[newStatus],
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        previousStatus: order.status,
        newStatus,
        storeName: order.store.name,
      },
    },
  });

  // If the order is cancelled, restore stock
  if (newStatus === OrderStatus.CANCELLED) {
    const orderWithItems = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (orderWithItems) {
      for (const item of orderWithItems.items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: { increment: item.quantity },
          },
        });
      }
    }
  }

  return updatedOrder;
};

/**
 * Get aggregate statistics for a store's orders.
 * Verifies that the requesting user owns the store.
 */
export const getOrderStats = async (storeId: string, ownerId: string): Promise<OrderStats> => {
  // Verify store ownership
  const store = await prisma.store.findUnique({ where: { id: storeId } });

  if (!store) {
    throw new AppError('Store not found', 404);
  }

  if (store.ownerId !== ownerId) {
    throw new AppError('You are not authorized to view stats for this store', 403);
  }

  // Get total orders and revenue (excluding cancelled orders for revenue)
  const [totalOrders, revenueResult, ordersByStatus] = await Promise.all([
    prisma.order.count({ where: { storeId } }),
    prisma.order.aggregate({
      where: {
        storeId,
        status: { not: OrderStatus.CANCELLED },
      },
      _sum: { total: true },
      _count: true,
    }),
    prisma.order.groupBy({
      by: ['status'],
      where: { storeId },
      _count: true,
    }),
  ]);

  const totalRevenue = revenueResult._sum.total
    ? Number(revenueResult._sum.total)
    : 0;
  const completedOrderCount = revenueResult._count || 0;
  const averageOrderValue =
    completedOrderCount > 0 ? totalRevenue / completedOrderCount : 0;

  // Build the ordersByStatus map
  const statusMap: Record<string, number> = {};
  for (const group of ordersByStatus) {
    statusMap[group.status] = group._count;
  }

  return {
    totalOrders,
    pendingOrders: statusMap['PENDING'] || 0,
    completedOrders: (statusMap['PICKED_UP'] || 0),
    cancelledOrders: statusMap['CANCELLED'] || 0,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    averageOrderValue: Math.round(averageOrderValue * 100) / 100,
    ordersByStatus: statusMap,
  };
};

// ─── Helpers (pickup code) ──────────────────────────────────────────────────

/**
 * Generate a random alphanumeric pickup code.
 */
const generatePickupCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// ─── Reorder ────────────────────────────────────────────────────────────────

/**
 * Clone items from a past order into a new order.
 * Validates stock availability and recalculates totals.
 */
export const reorderFromPast = async (orderId: string, customerId: string) => {
  // Fetch the past order with its items
  const pastOrder = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: true,
        },
      },
      store: true,
    },
  });

  if (!pastOrder) {
    throw new AppError('Order not found', 404);
  }

  if (pastOrder.customerId !== customerId) {
    throw new AppError('You can only reorder from your own past orders', 403);
  }

  // Verify the store is still active
  if (!pastOrder.store.isActive) {
    throw new AppError('This store is currently not accepting orders', 400);
  }

  // Build new order items, validating stock for each
  const orderItems: Array<{
    productId: string;
    quantity: number;
    unitPrice: Prisma.Decimal;
    totalPrice: Prisma.Decimal;
  }> = [];
  let subtotal = new Prisma.Decimal(0);
  const unavailableProducts: string[] = [];

  for (const item of pastOrder.items) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
    });

    if (!product || !product.isActive) {
      unavailableProducts.push(item.product.name);
      continue;
    }

    if (product.stockQuantity < item.quantity) {
      unavailableProducts.push(
        `${product.name} (only ${product.stockQuantity} available)`
      );
      continue;
    }

    const totalPrice = product.price.mul(item.quantity);
    subtotal = subtotal.add(totalPrice);

    orderItems.push({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: product.price,
      totalPrice,
    });
  }

  if (orderItems.length === 0) {
    throw new AppError(
      'No items from the previous order are currently available for reorder',
      400
    );
  }

  const tax = subtotal.mul(TAX_RATE).toDecimalPlaces(2);
  const total = subtotal.add(tax);
  const pickupCode = generatePickupCode();

  // Create the new order in a transaction
  const newOrder = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        customerId,
        storeId: pastOrder.storeId,
        status: OrderStatus.PENDING,
        subtotal,
        tax,
        total,
        pickupCode,
        notes: `Reorder from order #${pastOrder.orderNumber}`,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
              },
            },
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
          },
        },
      },
    });

    // Decrement stock
    for (const item of orderItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stockQuantity: { decrement: item.quantity },
        },
      });
    }

    return order;
  });

  // Notify the store owner
  await prisma.notification.create({
    data: {
      userId: pastOrder.store.ownerId,
      type: NotificationType.ORDER_STATUS,
      title: 'New Order Received (Reorder)',
      message: `You have received a reorder #${newOrder.orderNumber} totaling $${total.toFixed(2)}.`,
      data: {
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        total: total.toNumber(),
      },
    },
  });

  return {
    order: newOrder,
    unavailableProducts:
      unavailableProducts.length > 0 ? unavailableProducts : undefined,
  };
};

// ─── Check In ───────────────────────────────────────────────────────────────

/**
 * Customer checks in upon arrival at the store.
 * Only allowed for orders that are CONFIRMED, PREPARING, or READY.
 */
export const checkIn = async (orderId: string, customerId: string) => {
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

  if (order.customerId !== customerId) {
    throw new AppError('You can only check in for your own orders', 403);
  }

  if (order.customerCheckedIn) {
    throw new AppError('You have already checked in for this order', 400);
  }

  const allowedStatuses: OrderStatus[] = [
    OrderStatus.CONFIRMED,
    OrderStatus.PREPARING,
    OrderStatus.READY,
  ];

  if (!allowedStatuses.includes(order.status)) {
    throw new AppError(
      `Cannot check in for an order with status ${order.status}. Order must be CONFIRMED, PREPARING, or READY.`,
      400
    );
  }

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      customerCheckedIn: true,
      checkedInAt: new Date(),
    },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
            },
          },
        },
      },
      store: {
        select: {
          id: true,
          name: true,
          address: true,
        },
      },
    },
  });

  // Notify the store owner of customer arrival
  await prisma.notification.create({
    data: {
      userId: order.store.ownerId,
      type: NotificationType.ORDER_STATUS,
      title: `Customer Arrived for Order #${order.orderNumber}`,
      message: `The customer has checked in and is waiting for order #${order.orderNumber}.`,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
    },
  });

  return updatedOrder;
};

// ─── Verify Pickup ──────────────────────────────────────────────────────────

/**
 * Store owner verifies a pickup using the pickup code.
 * Transitions the order to PICKED_UP status.
 */
export const verifyPickup = async (orderId: string, storeOwnerId: string, pickupCode: string) => {
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

  if (order.store.ownerId !== storeOwnerId) {
    throw new AppError('You are not authorized to verify pickup for this order', 403);
  }

  if (order.status !== OrderStatus.READY) {
    throw new AppError(
      `Cannot verify pickup for an order with status ${order.status}. Order must be READY.`,
      400
    );
  }

  if (!order.pickupCode) {
    throw new AppError('This order does not have a pickup code', 400);
  }

  if (order.pickupCode !== pickupCode) {
    throw new AppError('Invalid pickup code', 400);
  }

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.PICKED_UP },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
            },
          },
        },
      },
      store: {
        select: {
          id: true,
          name: true,
          address: true,
        },
      },
    },
  });

  // Notify the customer
  await prisma.notification.create({
    data: {
      userId: order.customerId,
      type: NotificationType.ORDER_STATUS,
      title: `Order #${order.orderNumber} Picked Up`,
      message: `Your order #${order.orderNumber} has been verified and picked up. Thank you!`,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        newStatus: OrderStatus.PICKED_UP,
      },
    },
  });

  return updatedOrder;
};

// ─── Set Estimated Ready Time ───────────────────────────────────────────────

/**
 * Store owner sets or updates the estimated ready time for an order.
 */
export const setEstimatedReadyTime = async (
  orderId: string,
  storeOwnerId: string,
  minutes: number
) => {
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

  if (order.store.ownerId !== storeOwnerId) {
    throw new AppError('You are not authorized to update this order', 403);
  }

  const terminalStatuses: OrderStatus[] = [
    OrderStatus.PICKED_UP,
    OrderStatus.CANCELLED,
  ];

  if (terminalStatuses.includes(order.status)) {
    throw new AppError(
      `Cannot set estimated time for an order with status ${order.status}`,
      400
    );
  }

  const estimatedReadyTime = new Date(Date.now() + minutes * 60 * 1000);

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: { estimatedReadyTime },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
            },
          },
        },
      },
      store: {
        select: {
          id: true,
          name: true,
          address: true,
        },
      },
    },
  });

  // Notify the customer
  await prisma.notification.create({
    data: {
      userId: order.customerId,
      type: NotificationType.ORDER_STATUS,
      title: `Order #${order.orderNumber} – Estimated Ready Time Updated`,
      message: `Your order will be ready in approximately ${minutes} minute${minutes === 1 ? '' : 's'}.`,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        estimatedReadyTime: estimatedReadyTime.toISOString(),
        minutes,
      },
    },
  });

  return updatedOrder;
};

// ─── Apply Promotion ────────────────────────────────────────────────────────

/**
 * Apply a coupon code to an existing order.
 * Validates the coupon, calculates the discount, and updates the order total.
 */
export const applyPromotion = async (orderId: string, customerId: string, promotionCode: string) => {
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

  if (order.customerId !== customerId) {
    throw new AppError('You can only apply coupons to your own orders', 403);
  }

  if (order.status !== OrderStatus.PENDING) {
    throw new AppError('Coupons can only be applied to orders with PENDING status', 400);
  }

  if (order.promotionId) {
    throw new AppError('A promotion has already been applied to this order', 400);
  }

  // Validate the coupon code
  const promotion = await validateCouponCode(promotionCode, order.storeId);

  // Check minimum order amount
  if (promotion.minOrderAmount && order.subtotal.lessThan(promotion.minOrderAmount)) {
    throw new AppError(
      `This coupon requires a minimum order of $${Number(promotion.minOrderAmount).toFixed(2)}`,
      400
    );
  }

  // Calculate the discount
  const discountAmount = calculateDiscount(promotion, order.subtotal);
  const newTotal = order.subtotal.add(order.tax).sub(discountAmount);
  const finalTotal = newTotal.greaterThan(0) ? newTotal : new Prisma.Decimal(0);

  // Apply the promotion in a transaction
  const updatedOrder = await prisma.$transaction(async (tx) => {
    // Increment the promotion usage count
    await tx.promotion.update({
      where: { id: promotion.id },
      data: { currentUses: { increment: 1 } },
    });

    // Update the order with promotion details
    return tx.order.update({
      where: { id: orderId },
      data: {
        promotionId: promotion.id,
        discountAmount,
        total: finalTotal,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
              },
            },
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        promotion: true,
      },
    });
  });

  return updatedOrder;
};
