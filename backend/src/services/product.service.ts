import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { NotificationType, Prisma } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreateProductData {
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  imageUrl?: string;
  sku: string;
  barcode?: string;
  stockQuantity?: number;
  lowStockThreshold?: number;
}

interface UpdateProductData {
  categoryId?: string;
  name?: string;
  description?: string;
  price?: number;
  compareAtPrice?: number;
  imageUrl?: string;
  sku?: string;
  barcode?: string;
  stockQuantity?: number;
  lowStockThreshold?: number;
  isActive?: boolean;
}

interface ProductQuery {
  page?: number;
  limit?: number;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sortBy?: 'name' | 'price' | 'createdAt' | 'stockQuantity';
  sortOrder?: 'asc' | 'desc';
  inStock?: boolean;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Verify that the given user owns the store. Returns the store on success.
 */
const verifyStoreOwnership = async (storeId: string, ownerId: string) => {
  const store = await prisma.store.findUnique({ where: { id: storeId } });

  if (!store) {
    throw new AppError('Store not found', 404);
  }

  if (store.ownerId !== ownerId) {
    throw new AppError('You are not authorized to manage products for this store', 403);
  }

  return store;
};

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Create a new product in a store. Verifies store ownership first.
 */
export const createProduct = async (storeId: string, ownerId: string, data: CreateProductData) => {
  await verifyStoreOwnership(storeId, ownerId);

  // Verify that the category exists
  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category) {
    throw new AppError('Category not found', 404);
  }

  const product = await prisma.product.create({
    data: {
      storeId,
      categoryId: data.categoryId,
      name: data.name,
      description: data.description ?? null,
      price: new Prisma.Decimal(data.price),
      compareAtPrice: data.compareAtPrice != null ? new Prisma.Decimal(data.compareAtPrice) : null,
      imageUrl: data.imageUrl ?? null,
      sku: data.sku,
      barcode: data.barcode ?? null,
      stockQuantity: data.stockQuantity ?? 0,
      lowStockThreshold: data.lowStockThreshold ?? 5,
    },
    include: {
      category: true,
      store: {
        select: { id: true, name: true },
      },
    },
  });

  return product;
};

/**
 * Get products for a store with filtering, searching, sorting, and pagination.
 */
export const getProductsByStore = async (
  storeId: string,
  query: ProductQuery
): Promise<PaginatedResult<any>> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const offset = (page - 1) * limit;

  // Verify the store exists
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) {
    throw new AppError('Store not found', 404);
  }

  // Build where clause
  const where: Prisma.ProductWhereInput = {
    storeId,
    isActive: true,
  };

  if (query.categoryId) {
    where.categoryId = query.categoryId;
  }

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    where.price = {};
    if (query.minPrice !== undefined) {
      where.price.gte = new Prisma.Decimal(query.minPrice);
    }
    if (query.maxPrice !== undefined) {
      where.price.lte = new Prisma.Decimal(query.maxPrice);
    }
  }

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  if (query.inStock === true) {
    where.stockQuantity = { gt: 0 };
  }

  // Build orderBy
  const sortBy = query.sortBy ?? 'createdAt';
  const sortOrder = query.sortOrder ?? 'desc';
  const orderBy: Prisma.ProductOrderByWithRelationInput = { [sortBy]: sortOrder };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy,
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    data: products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get a single product by ID, including store and category info.
 */
export const getProductById = async (id: string) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      store: {
        select: {
          id: true,
          name: true,
          address: true,
          city: true,
          state: true,
          phone: true,
          isActive: true,
        },
      },
      category: true,
    },
  });

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  return product;
};

/**
 * Update a product. Verifies ownership through the store relation.
 */
export const updateProduct = async (id: string, ownerId: string, data: UpdateProductData) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { store: true },
  });

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  if (product.store.ownerId !== ownerId) {
    throw new AppError('You are not authorized to update this product', 403);
  }

  // If categoryId is being changed, verify the new category exists
  if (data.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) {
      throw new AppError('Category not found', 404);
    }
  }

  // Build update data, converting price fields to Decimal
  const updateData: Prisma.ProductUpdateInput = {};

  if (data.categoryId !== undefined) updateData.category = { connect: { id: data.categoryId } };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.price !== undefined) updateData.price = new Prisma.Decimal(data.price);
  if (data.compareAtPrice !== undefined) {
    updateData.compareAtPrice = data.compareAtPrice != null
      ? new Prisma.Decimal(data.compareAtPrice)
      : null;
  }
  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
  if (data.sku !== undefined) updateData.sku = data.sku;
  if (data.barcode !== undefined) updateData.barcode = data.barcode;
  if (data.stockQuantity !== undefined) updateData.stockQuantity = data.stockQuantity;
  if (data.lowStockThreshold !== undefined) updateData.lowStockThreshold = data.lowStockThreshold;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const updatedProduct = await prisma.product.update({
    where: { id },
    data: updateData,
    include: {
      category: true,
      store: { select: { id: true, name: true } },
    },
  });

  return updatedProduct;
};

/**
 * Delete a product. Verifies ownership through the store relation.
 */
export const deleteProduct = async (id: string, ownerId: string) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { store: true },
  });

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  if (product.store.ownerId !== ownerId) {
    throw new AppError('You are not authorized to delete this product', 403);
  }

  await prisma.product.delete({ where: { id } });

  return { message: 'Product deleted successfully' };
};

/**
 * Update the stock quantity for a product.
 * Creates a LOW_STOCK notification for the store owner if stock falls below the threshold.
 */
export const updateStock = async (id: string, ownerId: string, quantity: number) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { store: true },
  });

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  if (product.store.ownerId !== ownerId) {
    throw new AppError('You are not authorized to update stock for this product', 403);
  }

  if (quantity < 0) {
    throw new AppError('Stock quantity cannot be negative', 400);
  }

  const updatedProduct = await prisma.product.update({
    where: { id },
    data: { stockQuantity: quantity },
    include: {
      category: true,
      store: { select: { id: true, name: true, ownerId: true } },
    },
  });

  // Create a LOW_STOCK notification if stock is below the threshold
  if (quantity <= product.lowStockThreshold) {
    await prisma.notification.create({
      data: {
        userId: product.store.ownerId,
        type: NotificationType.LOW_STOCK,
        title: 'Low Stock Alert',
        message: `${product.name} in ${product.store.name} has only ${quantity} units remaining.`,
        data: {
          productId: product.id,
          storeId: product.store.id,
          productName: product.name,
          currentStock: quantity,
          threshold: product.lowStockThreshold,
        },
      },
    });
  }

  return updatedProduct;
};
