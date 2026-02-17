import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { Prisma } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreateStoreData {
  name: string;
  description?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  phone: string;
  email?: string;
  imageUrl?: string;
  hours?: Prisma.InputJsonValue;
}

interface UpdateStoreData {
  name?: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  imageUrl?: string;
  hours?: Prisma.InputJsonValue;
  isActive?: boolean;
}

interface StoreQuery {
  lat?: number;
  lng?: number;
  radius?: number; // in miles
  search?: string;
  page?: number;
  limit?: number;
  city?: string;
  state?: string;
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
 * Create a new store linked to the given owner.
 */
export const createStore = async (ownerId: string, data: CreateStoreData) => {
  // Verify the owner exists
  const owner = await prisma.user.findUnique({ where: { id: ownerId } });

  if (!owner) {
    throw new AppError('Owner not found', 404);
  }

  if (owner.role !== 'STORE_OWNER' && owner.role !== 'ADMIN') {
    throw new AppError('Only store owners can create stores', 403);
  }

  const store = await prisma.store.create({
    data: {
      ownerId,
      name: data.name,
      description: data.description ?? null,
      address: data.address,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      latitude: data.latitude,
      longitude: data.longitude,
      phone: data.phone,
      email: data.email ?? null,
      imageUrl: data.imageUrl ?? null,
      hours: data.hours ?? {},
    },
    include: {
      owner: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  return store;
};

/**
 * Get stores with optional proximity search, text search, and pagination.
 *
 * When `lat` and `lng` are provided the Haversine formula is used in a raw
 * SQL query to sort by distance and filter within the given radius.
 */
export const getStores = async (query: StoreQuery): Promise<PaginatedResult<any>> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const offset = (page - 1) * limit;

  // ── Proximity search with Haversine formula ──────────────────────────────
  if (query.lat !== undefined && query.lng !== undefined) {
    const radiusMiles = query.radius ?? 10;

    // Build optional WHERE clauses
    const searchCondition = query.search
      ? Prisma.sql`AND (LOWER(s."name") LIKE LOWER(${`%${query.search}%`}) OR LOWER(s."description") LIKE LOWER(${`%${query.search}%`}))`
      : Prisma.sql``;

    const cityCondition = query.city
      ? Prisma.sql`AND LOWER(s."city") = LOWER(${query.city})`
      : Prisma.sql``;

    const stateCondition = query.state
      ? Prisma.sql`AND LOWER(s."state") = LOWER(${query.state})`
      : Prisma.sql``;

    // Count total matching rows
    const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM "stores" s
      WHERE s."is_active" = true
        AND (
          3959 * acos(
            cos(radians(${query.lat})) * cos(radians(s."latitude"))
            * cos(radians(s."longitude") - radians(${query.lng}))
            + sin(radians(${query.lat})) * sin(radians(s."latitude"))
          )
        ) <= ${radiusMiles}
        ${searchCondition}
        ${cityCondition}
        ${stateCondition}
    `;

    const total = Number(countResult[0].count);

    // Fetch stores sorted by distance
    const stores = await prisma.$queryRaw`
      SELECT
        s."id",
        s."owner_id" AS "ownerId",
        s."name",
        s."description",
        s."address",
        s."city",
        s."state",
        s."zip_code" AS "zipCode",
        s."latitude",
        s."longitude",
        s."phone",
        s."email",
        s."image_url" AS "imageUrl",
        s."is_active" AS "isActive",
        s."hours",
        s."rating",
        s."review_count" AS "reviewCount",
        s."created_at" AS "createdAt",
        s."updated_at" AS "updatedAt",
        (
          3959 * acos(
            cos(radians(${query.lat})) * cos(radians(s."latitude"))
            * cos(radians(s."longitude") - radians(${query.lng}))
            + sin(radians(${query.lat})) * sin(radians(s."latitude"))
          )
        ) AS "distance"
      FROM "stores" s
      WHERE s."is_active" = true
        AND (
          3959 * acos(
            cos(radians(${query.lat})) * cos(radians(s."latitude"))
            * cos(radians(s."longitude") - radians(${query.lng}))
            + sin(radians(${query.lat})) * sin(radians(s."latitude"))
          )
        ) <= ${radiusMiles}
        ${searchCondition}
        ${cityCondition}
        ${stateCondition}
      ORDER BY "distance" ASC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    return {
      data: stores as any[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Standard query (no proximity) ────────────────────────────────────────
  const where: Prisma.StoreWhereInput = {
    isActive: true,
  };

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  if (query.city) {
    where.city = { equals: query.city, mode: 'insensitive' };
  }

  if (query.state) {
    where.state = { equals: query.state, mode: 'insensitive' };
  }

  const [stores, total] = await Promise.all([
    prisma.store.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { rating: 'desc' },
      include: {
        _count: { select: { products: true } },
      },
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
 * Get a single store by ID, including owner info and product count.
 */
export const getStoreById = async (id: string) => {
  const store = await prisma.store.findUnique({
    where: { id },
    include: {
      owner: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
      _count: {
        select: {
          products: true,
          orders: true,
          reviews: true,
        },
      },
    },
  });

  if (!store) {
    throw new AppError('Store not found', 404);
  }

  return store;
};

/**
 * Update a store. Only the owner can update their own store.
 */
export const updateStore = async (id: string, ownerId: string, data: UpdateStoreData) => {
  const store = await prisma.store.findUnique({ where: { id } });

  if (!store) {
    throw new AppError('Store not found', 404);
  }

  if (store.ownerId !== ownerId) {
    throw new AppError('You are not authorized to update this store', 403);
  }

  const updatedStore = await prisma.store.update({
    where: { id },
    data,
    include: {
      owner: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  return updatedStore;
};

/**
 * Soft-delete a store by setting isActive to false.
 * Only the owner can delete their own store.
 */
export const deleteStore = async (id: string, ownerId: string) => {
  const store = await prisma.store.findUnique({ where: { id } });

  if (!store) {
    throw new AppError('Store not found', 404);
  }

  if (store.ownerId !== ownerId) {
    throw new AppError('You are not authorized to delete this store', 403);
  }

  const deletedStore = await prisma.store.update({
    where: { id },
    data: { isActive: false },
  });

  return deletedStore;
};

/**
 * Get all stores owned by a specific user.
 */
export const getStoresByOwner = async (ownerId: string) => {
  const stores = await prisma.store.findMany({
    where: { ownerId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          products: true,
          orders: true,
          reviews: true,
        },
      },
    },
  });

  return stores;
};
