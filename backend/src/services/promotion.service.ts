import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { PromotionType, Prisma } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreatePromotionData {
  code?: string;
  type: PromotionType;
  value: number;
  minOrderAmount?: number;
  maxUses?: number;
  productIds?: string[];
  startDate: string;
  endDate: string;
  isActive?: boolean;
}

interface UpdatePromotionData {
  code?: string;
  type?: PromotionType;
  value?: number;
  minOrderAmount?: number | null;
  maxUses?: number | null;
  productIds?: string[] | null;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

interface PromotionQuery {
  activeOnly?: boolean;
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
 * Create a promotion for a store.
 * Validates that the user owns the store and that dates are valid.
 */
export const createPromotion = async (
  storeId: string,
  ownerId: string,
  data: CreatePromotionData
) => {
  // Verify store ownership
  const store = await prisma.store.findUnique({ where: { id: storeId } });

  if (!store) {
    throw new AppError('Store not found', 404);
  }

  if (store.ownerId !== ownerId) {
    throw new AppError('You are not authorized to create promotions for this store', 403);
  }

  // Validate dates
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);

  if (endDate <= startDate) {
    throw new AppError('End date must be after start date', 400);
  }

  // Validate percentage value
  if (data.type === 'PERCENTAGE' && data.value > 100) {
    throw new AppError('Percentage discount cannot exceed 100%', 400);
  }

  const promotion = await prisma.promotion.create({
    data: {
      storeId,
      code: data.code ?? null,
      type: data.type,
      value: data.value,
      minOrderAmount: data.minOrderAmount ?? null,
      maxUses: data.maxUses ?? null,
      productIds: data.productIds ?? Prisma.JsonNull,
      startDate,
      endDate,
      isActive: data.isActive ?? true,
    },
    include: {
      store: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return promotion;
};

/**
 * Get paginated promotions for a store.
 * Can optionally filter to only active promotions.
 */
export const getPromotions = async (
  storeId: string,
  query: PromotionQuery
): Promise<PaginatedResult<any>> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const offset = (page - 1) * limit;

  // Verify the store exists
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) {
    throw new AppError('Store not found', 404);
  }

  const now = new Date();
  const where: Prisma.PromotionWhereInput = { storeId };

  if (query.activeOnly !== false) {
    where.isActive = true;
    where.startDate = { lte: now };
    where.endDate = { gte: now };
  }

  const [promotions, total] = await Promise.all([
    prisma.promotion.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.promotion.count({ where }),
  ]);

  return {
    data: promotions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Update a promotion. Verifies that the user owns the store.
 */
export const updatePromotion = async (
  id: string,
  ownerId: string,
  data: UpdatePromotionData
) => {
  const promotion = await prisma.promotion.findUnique({
    where: { id },
    include: {
      store: {
        select: {
          ownerId: true,
        },
      },
    },
  });

  if (!promotion) {
    throw new AppError('Promotion not found', 404);
  }

  if (promotion.store.ownerId !== ownerId) {
    throw new AppError('You are not authorized to update this promotion', 403);
  }

  // Validate dates if both are provided or if one changes
  const startDate = data.startDate ? new Date(data.startDate) : promotion.startDate;
  const endDate = data.endDate ? new Date(data.endDate) : promotion.endDate;

  if (endDate <= startDate) {
    throw new AppError('End date must be after start date', 400);
  }

  // Validate percentage value
  const type = data.type ?? promotion.type;
  const value = data.value ?? Number(promotion.value);
  if (type === 'PERCENTAGE' && value > 100) {
    throw new AppError('Percentage discount cannot exceed 100%', 400);
  }

  const updateData: Prisma.PromotionUpdateInput = {};

  if (data.code !== undefined) updateData.code = data.code;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.value !== undefined) updateData.value = data.value;
  if (data.minOrderAmount !== undefined) updateData.minOrderAmount = data.minOrderAmount;
  if (data.maxUses !== undefined) updateData.maxUses = data.maxUses;
  if (data.productIds !== undefined) updateData.productIds = data.productIds === null ? Prisma.JsonNull : data.productIds;
  if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
  if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const updatedPromotion = await prisma.promotion.update({
    where: { id },
    data: updateData,
  });

  return updatedPromotion;
};

/**
 * Delete a promotion. Verifies that the user owns the store.
 */
export const deletePromotion = async (id: string, ownerId: string) => {
  const promotion = await prisma.promotion.findUnique({
    where: { id },
    include: {
      store: {
        select: {
          ownerId: true,
        },
      },
    },
  });

  if (!promotion) {
    throw new AppError('Promotion not found', 404);
  }

  if (promotion.store.ownerId !== ownerId) {
    throw new AppError('You are not authorized to delete this promotion', 403);
  }

  await prisma.promotion.delete({ where: { id } });

  return { message: 'Promotion deleted successfully' };
};

/**
 * Validate and retrieve a promotion by coupon code for a specific store.
 * Checks that the promotion is active, within date range, and has remaining uses.
 */
export const validateCouponCode = async (code: string, storeId: string) => {
  const now = new Date();

  const promotion = await prisma.promotion.findFirst({
    where: {
      code,
      storeId,
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
    },
  });

  if (!promotion) {
    throw new AppError('Invalid or expired coupon code', 400);
  }

  if (promotion.maxUses && promotion.currentUses >= promotion.maxUses) {
    throw new AppError('This coupon has reached its maximum number of uses', 400);
  }

  return promotion;
};

/**
 * Calculate the discount amount for a promotion given a subtotal.
 */
export const calculateDiscount = (
  promotion: { type: PromotionType; value: Prisma.Decimal },
  subtotal: Prisma.Decimal
): Prisma.Decimal => {
  const value = promotion.value;

  switch (promotion.type) {
    case 'PERCENTAGE': {
      return subtotal.mul(value).div(100).toDecimalPlaces(2);
    }
    case 'FIXED_AMOUNT': {
      // Discount cannot exceed subtotal
      return value.greaterThan(subtotal) ? subtotal : value;
    }
    case 'BUY_X_GET_Y': {
      // For BUY_X_GET_Y, the value is used as a fixed discount amount
      return value.greaterThan(subtotal) ? subtotal : value;
    }
    default:
      return new Prisma.Decimal(0);
  }
};
