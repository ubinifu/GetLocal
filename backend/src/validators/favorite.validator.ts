import { z } from 'zod';

// ---------------------------------------------------------------------------
// Create Favorite
// ---------------------------------------------------------------------------
export const createFavoriteSchema = z
  .object({
    productId: z.uuid('Invalid product ID').optional(),
    storeId: z.uuid('Invalid store ID').optional(),
  })
  .refine((data) => data.productId || data.storeId, {
    message: 'Either productId or storeId must be provided',
  })
  .refine((data) => !(data.productId && data.storeId), {
    message: 'Only one of productId or storeId can be provided at a time',
  });

export type CreateFavoriteInput = z.infer<typeof createFavoriteSchema>;

// ---------------------------------------------------------------------------
// Favorite Query (filter / paginate)
// ---------------------------------------------------------------------------
export const favoriteQuerySchema = z.object({
  type: z.enum(['product', 'store']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100, 'Limit must not exceed 100').default(20),
});

export type FavoriteQueryInput = z.infer<typeof favoriteQuerySchema>;
