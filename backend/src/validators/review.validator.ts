import { z } from 'zod';

// ---------------------------------------------------------------------------
// Create Review
// ---------------------------------------------------------------------------
export const createReviewSchema = z.object({
  storeId: z.uuid('Invalid store ID'),
  orderId: z.uuid('Invalid order ID').optional(),
  rating: z
    .int('Rating must be an integer')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must not exceed 5'),
  comment: z
    .string()
    .max(1000, 'Comment must not exceed 1000 characters')
    .optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
