import { z } from 'zod';

// ---------------------------------------------------------------------------
// Create Promotion
// ---------------------------------------------------------------------------
export const createPromotionSchema = z.object({
  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .max(50, 'Code must not exceed 50 characters')
    .transform((val) => val.toUpperCase())
    .optional(),
  type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'BUY_X_GET_Y']),
  value: z.number().positive('Value must be a positive number'),
  minOrderAmount: z.number().positive('Minimum order amount must be positive').optional(),
  maxUses: z.int('Max uses must be an integer').positive('Max uses must be positive').optional(),
  productIds: z.array(z.uuid('Invalid product ID')).optional(),
  startDate: z.iso.datetime('Invalid ISO datetime format for start date'),
  endDate: z.iso.datetime('Invalid ISO datetime format for end date'),
  isActive: z.boolean().default(true),
});

export type CreatePromotionInput = z.infer<typeof createPromotionSchema>;

// ---------------------------------------------------------------------------
// Update Promotion
// ---------------------------------------------------------------------------
export const updatePromotionSchema = z.object({
  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .max(50, 'Code must not exceed 50 characters')
    .transform((val) => val.toUpperCase())
    .optional(),
  type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'BUY_X_GET_Y']).optional(),
  value: z.number().positive('Value must be a positive number').optional(),
  minOrderAmount: z.number().positive('Minimum order amount must be positive').nullable().optional(),
  maxUses: z.int('Max uses must be an integer').positive('Max uses must be positive').nullable().optional(),
  productIds: z.array(z.uuid('Invalid product ID')).nullable().optional(),
  startDate: z.iso.datetime('Invalid ISO datetime format for start date').optional(),
  endDate: z.iso.datetime('Invalid ISO datetime format for end date').optional(),
  isActive: z.boolean().optional(),
});

export type UpdatePromotionInput = z.infer<typeof updatePromotionSchema>;

// ---------------------------------------------------------------------------
// Apply Coupon
// ---------------------------------------------------------------------------
export const applyCouponSchema = z.object({
  code: z
    .string()
    .min(1, 'Coupon code is required')
    .max(50, 'Coupon code must not exceed 50 characters')
    .transform((val) => val.toUpperCase()),
});

export type ApplyCouponInput = z.infer<typeof applyCouponSchema>;

// ---------------------------------------------------------------------------
// Promotion Query (filter / paginate)
// ---------------------------------------------------------------------------
export const promotionQuerySchema = z.object({
  activeOnly: z.coerce.boolean().default(true),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100, 'Limit must not exceed 100').default(20),
});

export type PromotionQueryInput = z.infer<typeof promotionQuerySchema>;

// ---------------------------------------------------------------------------
// Estimated Time
// ---------------------------------------------------------------------------
export const estimatedTimeSchema = z.object({
  minutes: z
    .int('Minutes must be an integer')
    .positive('Minutes must be a positive number')
    .max(480, 'Estimated time must not exceed 8 hours'),
});

export type EstimatedTimeInput = z.infer<typeof estimatedTimeSchema>;

// ---------------------------------------------------------------------------
// Verify Pickup
// ---------------------------------------------------------------------------
export const verifyPickupSchema = z.object({
  pickupCode: z
    .string()
    .min(1, 'Pickup code is required')
    .max(10, 'Pickup code must not exceed 10 characters'),
});

export type VerifyPickupInput = z.infer<typeof verifyPickupSchema>;
