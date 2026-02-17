import { z } from 'zod';

// ---------------------------------------------------------------------------
// Create Order
// ---------------------------------------------------------------------------
export const createOrderSchema = z.object({
  storeId: z.uuid('Invalid store ID'),
  items: z
    .array(
      z.object({
        productId: z.uuid('Invalid product ID'),
        quantity: z.int('Quantity must be an integer').positive('Quantity must be at least 1'),
      }),
    )
    .min(1, 'Order must contain at least one item'),
  pickupTime: z
    .iso
    .datetime('Invalid ISO datetime format')
    .refine(
      (val) => new Date(val) > new Date(),
      'Pickup time must be in the future',
    )
    .optional(),
  notes: z
    .string()
    .max(500, 'Notes must not exceed 500 characters')
    .optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

// ---------------------------------------------------------------------------
// Update Order Status
// ---------------------------------------------------------------------------
export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'CONFIRMED',
    'PREPARING',
    'READY',
    'PICKED_UP',
    'CANCELLED',
  ]),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

// ---------------------------------------------------------------------------
// Order Query (filter / paginate)
// ---------------------------------------------------------------------------
export const orderQuerySchema = z.object({
  status: z
    .enum([
      'PENDING',
      'CONFIRMED',
      'PREPARING',
      'READY',
      'PICKED_UP',
      'CANCELLED',
    ])
    .optional(),
  storeId: z.uuid('Invalid store ID').optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100, 'Limit must not exceed 100').default(20),
});

export type OrderQueryInput = z.infer<typeof orderQuerySchema>;
