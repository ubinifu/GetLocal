import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { UserRole, OrderStatus, Prisma } from '@prisma/client';
import type {
  AdminUserQuery,
  AdminUpdateUserInput,
  AdminStoreQuery,
  AdminUpdateStoreInput,
  AdminOrderQuery,
  AdminCreateCategoryInput,
  AdminUpdateCategoryInput,
} from '../validators/admin.validator';

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

// ─── Dashboard ───────────────────────────────────────────────────────────────

/**
 * Retrieve aggregated dashboard statistics for the admin panel.
 */
export const getDashboardStats = async () => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Run all count / aggregate queries in parallel for performance.
  const [
    totalUsers,
    totalStores,
    totalOrders,
    revenueAggregate,
    newUsers,
    newOrders,
    ordersByStatus,
    revenueByDay,
  ] = await Promise.all([
    // Total users
    prisma.user.count(),

    // Total stores
    prisma.store.count(),

    // Total orders
    prisma.order.count(),

    // Total revenue (sum of order totals)
    prisma.order.aggregate({
      _sum: { total: true },
    }),

    // New users in the last 30 days
    prisma.user.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    }),

    // New orders in the last 30 days
    prisma.order.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    }),

    // Orders grouped by status
    prisma.order.groupBy({
      by: ['status'],
      _count: { id: true },
    }),

    // Revenue by day for the last 7 days (raw SQL for date truncation)
    prisma.$queryRaw<Array<{ date: string; revenue: Prisma.Decimal }>>`
      SELECT
        DATE(created_at) AS date,
        COALESCE(SUM(total), 0) AS revenue
      FROM orders
      WHERE created_at >= ${sevenDaysAgo}
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `,
  ]);

  // Transform ordersByStatus into a keyed object for easier consumption.
  const statusCounts: Record<string, number> = {};
  for (const entry of ordersByStatus) {
    statusCounts[entry.status] = entry._count.id;
  }

  return {
    totalUsers,
    totalStores,
    totalOrders,
    totalRevenue: revenueAggregate._sum.total ?? 0,
    newUsersLast30Days: newUsers,
    newOrdersLast30Days: newOrders,
    ordersByStatus: statusCounts,
    revenueByDay,
  };
};

// ─── Users ──────────────────────────────────────────────────────────────────

/**
 * Paginated list of users with optional filters.
 */
export const getUsers = async (query: AdminUserQuery): Promise<PaginatedResult<any>> => {
  const { page, limit, role, search, isVerified } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {};

  if (role) {
    where.role = role as UserRole;
  }

  if (isVerified !== undefined) {
    where.isVerified = isVerified;
  }

  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { orders: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Retrieve a single user by ID with related counts.
 */
export const getUserById = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
      stores: {
        select: {
          id: true,
          name: true,
          isActive: true,
          city: true,
          state: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          orders: true,
          reviews: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user;
};

/**
 * Update a user's role or verification status.
 * Prevents demoting the last remaining admin.
 */
export const updateUser = async (id: string, data: AdminUpdateUserInput) => {
  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Prevent demoting the last admin.
  if (user.role === UserRole.ADMIN && data.role && data.role !== 'ADMIN') {
    const adminCount = await prisma.user.count({
      where: { role: UserRole.ADMIN },
    });

    if (adminCount <= 1) {
      throw new AppError('Cannot demote the last admin user', 400);
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: {
      ...(data.role !== undefined && { role: data.role as UserRole }),
      ...(data.isVerified !== undefined && { isVerified: data.isVerified }),
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updatedUser;
};

/**
 * Delete a user.
 * Admins cannot be deleted via this endpoint.
 */
export const deleteUser = async (id: string) => {
  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.role === UserRole.ADMIN) {
    throw new AppError('Cannot delete an admin user', 400);
  }

  await prisma.user.delete({ where: { id } });
};

// ─── Stores ─────────────────────────────────────────────────────────────────

/**
 * Paginated list of stores with optional filters.
 */
export const getStores = async (query: AdminStoreQuery): Promise<PaginatedResult<any>> => {
  const { page, limit, isActive, search, ownerId } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.StoreWhereInput = {};

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  if (ownerId) {
    where.ownerId = ownerId;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [stores, total] = await Promise.all([
    prisma.store.findMany({
      where,
      select: {
        id: true,
        ownerId: true,
        name: true,
        description: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        phone: true,
        email: true,
        imageUrl: true,
        isActive: true,
        rating: true,
        reviewCount: true,
        createdAt: true,
        updatedAt: true,
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            products: true,
            orders: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.store.count({ where }),
  ]);

  return {
    data: stores,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Update any field on a store (admin override - no ownership check).
 */
export const updateStore = async (id: string, data: AdminUpdateStoreInput) => {
  const store = await prisma.store.findUnique({ where: { id } });

  if (!store) {
    throw new AppError('Store not found', 404);
  }

  const updatedStore = await prisma.store.update({
    where: { id },
    data,
  });

  return updatedStore;
};

/**
 * Delete a store.
 */
export const deleteStore = async (id: string) => {
  const store = await prisma.store.findUnique({ where: { id } });

  if (!store) {
    throw new AppError('Store not found', 404);
  }

  await prisma.store.delete({ where: { id } });
};

// ─── Orders ─────────────────────────────────────────────────────────────────

/**
 * Paginated list of ALL orders with optional filters.
 */
export const getOrders = async (query: AdminOrderQuery): Promise<PaginatedResult<any>> => {
  const { page, limit, status, storeId, dateFrom, dateTo } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.OrderWhereInput = {};

  if (status) {
    where.status = status as OrderStatus;
  }

  if (storeId) {
    where.storeId = storeId;
  }

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) {
      where.createdAt.gte = new Date(dateFrom);
    }
    if (dateTo) {
      where.createdAt.lte = new Date(dateTo);
    }
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      select: {
        id: true,
        orderNumber: true,
        customerId: true,
        storeId: true,
        status: true,
        subtotal: true,
        tax: true,
        total: true,
        discountAmount: true,
        pickupTime: true,
        pickupCode: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: { items: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
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

// ─── Categories ─────────────────────────────────────────────────────────────

/**
 * List all categories with product count.
 */
export const getCategories = async () => {
  const categories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      imageUrl: true,
      createdAt: true,
      _count: {
        select: { products: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  return categories;
};

/**
 * Create a new category.
 */
export const createCategory = async (data: AdminCreateCategoryInput) => {
  const existing = await prisma.category.findUnique({
    where: { name: data.name },
  });

  if (existing) {
    throw new AppError('A category with this name already exists', 409);
  }

  const category = await prisma.category.create({
    data: {
      name: data.name,
      description: data.description ?? null,
      imageUrl: data.imageUrl ?? null,
    },
  });

  return category;
};

/**
 * Update a category.
 */
export const updateCategory = async (id: string, data: AdminUpdateCategoryInput) => {
  const category = await prisma.category.findUnique({ where: { id } });

  if (!category) {
    throw new AppError('Category not found', 404);
  }

  // If renaming, check for name conflicts.
  if (data.name && data.name !== category.name) {
    const existing = await prisma.category.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw new AppError('A category with this name already exists', 409);
    }
  }

  const updatedCategory = await prisma.category.update({
    where: { id },
    data,
  });

  return updatedCategory;
};

/**
 * Delete a category.
 * Only allowed if no products reference it.
 */
export const deleteCategory = async (id: string) => {
  const category = await prisma.category.findUnique({ where: { id } });

  if (!category) {
    throw new AppError('Category not found', 404);
  }

  const productCount = await prisma.product.count({
    where: { categoryId: id },
  });

  if (productCount > 0) {
    throw new AppError(
      `Cannot delete category: ${productCount} product(s) still reference it. Reassign or remove them first.`,
      400
    );
  }

  await prisma.category.delete({ where: { id } });
};
