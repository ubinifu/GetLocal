import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { Prisma } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreateFavoriteData {
  productId?: string;
  storeId?: string;
}

interface FavoriteQuery {
  type?: 'product' | 'store';
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
 * Add a product or store to the user's favorites.
 * Validates that the referenced product or store exists before creating.
 */
export const addFavorite = async (userId: string, data: CreateFavoriteData) => {
  if (!data.productId && !data.storeId) {
    throw new AppError('Either productId or storeId must be provided', 400);
  }

  if (data.productId && data.storeId) {
    throw new AppError('Only one of productId or storeId can be provided at a time', 400);
  }

  // Verify the referenced entity exists
  if (data.productId) {
    const product = await prisma.product.findUnique({ where: { id: data.productId } });
    if (!product) {
      throw new AppError('Product not found', 404);
    }
  }

  if (data.storeId) {
    const store = await prisma.store.findUnique({ where: { id: data.storeId } });
    if (!store) {
      throw new AppError('Store not found', 404);
    }
  }

  // Check if the favorite already exists
  const existingFavorite = await prisma.favorite.findFirst({
    where: {
      userId,
      ...(data.productId ? { productId: data.productId } : {}),
      ...(data.storeId ? { storeId: data.storeId } : {}),
    },
  });

  if (existingFavorite) {
    throw new AppError('This item is already in your favorites', 409);
  }

  const favorite = await prisma.favorite.create({
    data: {
      userId,
      productId: data.productId ?? null,
      storeId: data.storeId ?? null,
    },
    include: {
      product: data.productId
        ? {
            select: {
              id: true,
              name: true,
              price: true,
              imageUrl: true,
              storeId: true,
            },
          }
        : false,
      store: data.storeId
        ? {
            select: {
              id: true,
              name: true,
              address: true,
              imageUrl: true,
              rating: true,
            },
          }
        : false,
    },
  });

  return favorite;
};

/**
 * Get paginated favorites for a user, optionally filtered by type (product or store).
 */
export const getFavorites = async (
  userId: string,
  query: FavoriteQuery
): Promise<PaginatedResult<any>> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const offset = (page - 1) * limit;

  const where: Prisma.FavoriteWhereInput = { userId };

  if (query.type === 'product') {
    where.productId = { not: null };
  } else if (query.type === 'store') {
    where.storeId = { not: null };
  }

  const [favorites, total] = await Promise.all([
    prisma.favorite.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            imageUrl: true,
            storeId: true,
            isActive: true,
            stockQuantity: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            state: true,
            imageUrl: true,
            rating: true,
            isActive: true,
          },
        },
      },
    }),
    prisma.favorite.count({ where }),
  ]);

  return {
    data: favorites,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Remove a favorite by ID. Verifies that the favorite belongs to the user.
 */
export const removeFavorite = async (id: string, userId: string) => {
  const favorite = await prisma.favorite.findUnique({ where: { id } });

  if (!favorite) {
    throw new AppError('Favorite not found', 404);
  }

  if (favorite.userId !== userId) {
    throw new AppError('You are not authorized to remove this favorite', 403);
  }

  await prisma.favorite.delete({ where: { id } });

  return { message: 'Favorite removed successfully' };
};
