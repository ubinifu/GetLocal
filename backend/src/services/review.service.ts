import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreateReviewData {
  storeId: string;
  orderId?: string;
  rating: number;
  comment?: string;
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
 * Create a review for a store. Verifies that the customer has placed at least
 * one order at the store before allowing a review.
 */
export const createReview = async (customerId: string, data: CreateReviewData) => {
  // Validate rating range
  if (data.rating < 1 || data.rating > 5) {
    throw new AppError('Rating must be between 1 and 5', 400);
  }

  // Verify the store exists
  const store = await prisma.store.findUnique({ where: { id: data.storeId } });

  if (!store) {
    throw new AppError('Store not found', 404);
  }

  // Verify that the customer has ordered from this store
  const customerOrder = await prisma.order.findFirst({
    where: {
      customerId,
      storeId: data.storeId,
    },
  });

  if (!customerOrder) {
    throw new AppError('You can only review stores you have ordered from', 403);
  }

  // If an orderId is provided, verify it belongs to this customer and store
  if (data.orderId) {
    const order = await prisma.order.findUnique({ where: { id: data.orderId } });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    if (order.customerId !== customerId) {
      throw new AppError('You can only review your own orders', 403);
    }

    if (order.storeId !== data.storeId) {
      throw new AppError('Order does not belong to this store', 400);
    }

    // Check if this order has already been reviewed by this customer
    const existingReview = await prisma.review.findFirst({
      where: {
        customerId,
        orderId: data.orderId,
      },
    });

    if (existingReview) {
      throw new AppError('You have already reviewed this order', 409);
    }
  }

  // Create the review
  const review = await prisma.review.create({
    data: {
      customerId,
      storeId: data.storeId,
      orderId: data.orderId ?? null,
      rating: data.rating,
      comment: data.comment ?? null,
    },
    include: {
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  // Recalculate the store rating and review count
  const aggregation = await prisma.review.aggregate({
    where: { storeId: data.storeId },
    _avg: { rating: true },
    _count: true,
  });

  await prisma.store.update({
    where: { id: data.storeId },
    data: {
      rating: aggregation._avg.rating ?? 0,
      reviewCount: aggregation._count,
    },
  });

  return review;
};

/**
 * Get paginated reviews for a store, including customer info, sorted newest first.
 */
export const getReviewsByStore = async (
  storeId: string,
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResult<any>> => {
  const offset = (page - 1) * limit;

  // Verify the store exists
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) {
    throw new AppError('Store not found', 404);
  }

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where: { storeId },
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
          },
        },
      },
    }),
    prisma.review.count({ where: { storeId } }),
  ]);

  return {
    data: reviews,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Delete a review. Only the customer who created the review can delete it.
 * Recalculates the store rating after deletion.
 */
export const deleteReview = async (id: string, customerId: string) => {
  const review = await prisma.review.findUnique({ where: { id } });

  if (!review) {
    throw new AppError('Review not found', 404);
  }

  if (review.customerId !== customerId) {
    throw new AppError('You are not authorized to delete this review', 403);
  }

  const storeId = review.storeId;

  // Delete the review
  await prisma.review.delete({ where: { id } });

  // Recalculate the store rating
  const aggregation = await prisma.review.aggregate({
    where: { storeId },
    _avg: { rating: true },
    _count: true,
  });

  await prisma.store.update({
    where: { id: storeId },
    data: {
      rating: aggregation._avg.rating ?? 0,
      reviewCount: aggregation._count,
    },
  });

  return { message: 'Review deleted successfully' };
};
