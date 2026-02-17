import { z } from 'zod';

// ---------------------------------------------------------------------------
// Admin User Query (GET /admin/users)
// ---------------------------------------------------------------------------

export const adminUserQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(100, 'Limit must not exceed 100')
    .default(20),
  role: z.enum(['CUSTOMER', 'STORE_OWNER', 'ADMIN']).optional(),
  search: z.string().optional(),
  isVerified: z.coerce.boolean().optional(),
});

export type AdminUserQuery = z.infer<typeof adminUserQuerySchema>;

// ---------------------------------------------------------------------------
// Admin Update User (PUT /admin/users/:id)
// ---------------------------------------------------------------------------

export const adminUpdateUserSchema = z.object({
  role: z.enum(['CUSTOMER', 'STORE_OWNER', 'ADMIN']).optional(),
  isVerified: z.boolean().optional(),
});

export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;

// ---------------------------------------------------------------------------
// Admin Store Query (GET /admin/stores)
// ---------------------------------------------------------------------------

export const adminStoreQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(100, 'Limit must not exceed 100')
    .default(20),
  isActive: z.coerce.boolean().optional(),
  search: z.string().optional(),
  ownerId: z.string().uuid('Invalid owner ID format').optional(),
});

export type AdminStoreQuery = z.infer<typeof adminStoreQuerySchema>;

// ---------------------------------------------------------------------------
// Admin Update Store (PUT /admin/stores/:id)
// ---------------------------------------------------------------------------

export const adminUpdateStoreSchema = z.object({
  isActive: z.boolean().optional(),
  name: z
    .string()
    .min(2, 'Store name must be at least 2 characters')
    .max(255, 'Store name must not exceed 255 characters')
    .optional(),
  description: z
    .string()
    .max(500, 'Description must not exceed 500 characters')
    .optional(),
  address: z.string().min(1, 'Address is required').optional(),
  city: z.string().min(1, 'City is required').optional(),
  state: z.string().max(50, 'State must not exceed 50 characters').optional(),
  zipCode: z.string().max(20, 'Zip code must not exceed 20 characters').optional(),
  phone: z.string().max(20, 'Phone must not exceed 20 characters').optional(),
  email: z.string().email('Invalid email address').optional().nullable(),
  imageUrl: z.string().url('Invalid image URL').optional().nullable(),
});

export type AdminUpdateStoreInput = z.infer<typeof adminUpdateStoreSchema>;

// ---------------------------------------------------------------------------
// Admin Order Query (GET /admin/orders)
// ---------------------------------------------------------------------------

export const adminOrderQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(100, 'Limit must not exceed 100')
    .default(20),
  status: z
    .enum(['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'PICKED_UP', 'CANCELLED'])
    .optional(),
  storeId: z.string().uuid('Invalid store ID format').optional(),
  dateFrom: z.string().datetime({ message: 'dateFrom must be a valid ISO datetime' }).optional(),
  dateTo: z.string().datetime({ message: 'dateTo must be a valid ISO datetime' }).optional(),
});

export type AdminOrderQuery = z.infer<typeof adminOrderQuerySchema>;

// ---------------------------------------------------------------------------
// Admin Create Category (POST /admin/categories)
// ---------------------------------------------------------------------------

export const adminCreateCategorySchema = z.object({
  name: z
    .string()
    .min(2, 'Category name must be at least 2 characters')
    .max(100, 'Category name must not exceed 100 characters'),
  description: z.string().optional(),
  imageUrl: z.string().url('Invalid image URL').optional(),
});

export type AdminCreateCategoryInput = z.infer<typeof adminCreateCategorySchema>;

// ---------------------------------------------------------------------------
// Admin Update Category (PUT /admin/categories/:id)
// ---------------------------------------------------------------------------

export const adminUpdateCategorySchema = z.object({
  name: z
    .string()
    .min(2, 'Category name must be at least 2 characters')
    .max(100, 'Category name must not exceed 100 characters')
    .optional(),
  description: z.string().optional(),
  imageUrl: z.string().url('Invalid image URL').optional().nullable(),
});

export type AdminUpdateCategoryInput = z.infer<typeof adminUpdateCategorySchema>;
