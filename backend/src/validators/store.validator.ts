import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared: daily hours entry (open/close times or null when closed)
// ---------------------------------------------------------------------------
const dayHoursSchema = z
  .object({
    open: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
    close: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  })
  .nullable();

// ---------------------------------------------------------------------------
// Create Store
// ---------------------------------------------------------------------------
export const createStoreSchema = z.object({
  name: z
    .string()
    .min(2, 'Store name must be at least 2 characters')
    .max(100, 'Store name must not exceed 100 characters'),
  description: z
    .string()
    .max(500, 'Description must not exceed 500 characters')
    .optional(),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z
    .string()
    .length(2, 'State must be exactly 2 characters')
    .regex(/^[A-Z]{2}$/, 'State must be a 2-letter uppercase code'),
  zipCode: z
    .string()
    .regex(/^\d{5}$/, 'Zip code must be exactly 5 digits'),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
  email: z.email('Invalid email address').optional(),
  latitude: z
    .number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  longitude: z
    .number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
  hours: z.object({
    mon: dayHoursSchema,
    tue: dayHoursSchema,
    wed: dayHoursSchema,
    thu: dayHoursSchema,
    fri: dayHoursSchema,
    sat: dayHoursSchema,
    sun: dayHoursSchema,
  }),
});

export type CreateStoreInput = z.infer<typeof createStoreSchema>;

// ---------------------------------------------------------------------------
// Update Store (all fields optional)
// ---------------------------------------------------------------------------
export const updateStoreSchema = createStoreSchema.partial();

export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;

// ---------------------------------------------------------------------------
// Store Query (search / nearby)
// ---------------------------------------------------------------------------
export const storeQuerySchema = z.object({
  latitude: z.coerce
    .number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90')
    .optional(),
  longitude: z.coerce
    .number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180')
    .optional(),
  radius: z.coerce
    .number()
    .max(50, 'Radius must not exceed 50 km')
    .default(10),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(100, 'Limit must not exceed 100')
    .default(20),
});

export type StoreQueryInput = z.infer<typeof storeQuerySchema>;
