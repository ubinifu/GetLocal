import { z } from 'zod';

// ---------------------------------------------------------------------------
// Create Product
// ---------------------------------------------------------------------------
export const createProductSchema = z.object({
  name: z
    .string()
    .min(2, 'Product name must be at least 2 characters')
    .max(200, 'Product name must not exceed 200 characters'),
  description: z
    .string()
    .max(1000, 'Description must not exceed 1000 characters')
    .optional(),
  price: z
    .number()
    .positive('Price must be a positive number')
    .multipleOf(0.01, 'Price must have at most 2 decimal places'),
  compareAtPrice: z
    .number()
    .positive('Compare-at price must be a positive number')
    .optional(),
  categoryId: z.uuid('Invalid category ID'),
  sku: z.string().min(1, 'SKU is required'),
  barcode: z.string().optional(),
  stockQuantity: z
    .int('Stock quantity must be an integer')
    .nonnegative('Stock quantity must not be negative'),
  lowStockThreshold: z
    .int('Low stock threshold must be an integer')
    .nonnegative('Low stock threshold must not be negative')
    .optional()
    .default(5),
  imageUrl: z.url('Invalid image URL').optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

// ---------------------------------------------------------------------------
// Update Product (all fields optional)
// ---------------------------------------------------------------------------
export const updateProductSchema = createProductSchema.partial();

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

// ---------------------------------------------------------------------------
// Product Query (search / filter / paginate)
// ---------------------------------------------------------------------------
export const productQuerySchema = z.object({
  search: z.string().optional(),
  categoryId: z.uuid('Invalid category ID').optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  inStock: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(100, 'Limit must not exceed 100')
    .default(20),
  sortBy: z.enum(['price', 'name', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type ProductQueryInput = z.infer<typeof productQuerySchema>;
