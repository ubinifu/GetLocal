import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared: password with complexity requirements
// ---------------------------------------------------------------------------
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------
export const registerSchema = z
  .object({
    email: z.email('Invalid email address'),
    password: passwordSchema,
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    phone: z
      .string()
      .regex(
        /^\+?[1-9]\d{1,14}$/,
        'Invalid phone number format',
      )
      .optional(),
    role: z.enum(['CUSTOMER', 'STORE_OWNER']),
    // Store fields – required when role is STORE_OWNER
    storeName: z.string().min(2, 'Store name must be at least 2 characters').max(100).optional(),
    storeAddress: z.string().min(5, 'Store address is required').optional(),
    storeCity: z.string().min(2, 'City is required').optional(),
    storeState: z.string().length(2, 'State must be 2 characters').toUpperCase().optional(),
    storeZipCode: z.string().regex(/^\d{5}$/, 'Zip code must be 5 digits').optional(),
  })
  .refine(
    (data) => {
      if (data.role === 'STORE_OWNER') {
        return data.storeName && data.storeAddress && data.storeCity && data.storeState && data.storeZipCode;
      }
      return true;
    },
    {
      message: 'Store name, address, city, state, and zip code are required for store owners',
      path: ['storeName'],
    },
  );

export type RegisterInput = z.infer<typeof registerSchema>;

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
export const loginSchema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
// Refresh Token
// ---------------------------------------------------------------------------
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

// ---------------------------------------------------------------------------
// Change Password
// ---------------------------------------------------------------------------
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
