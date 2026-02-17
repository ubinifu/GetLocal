import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { config } from '../config';
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: UserRole;
  storeName?: string;
  storeAddress?: string;
  storeCity?: string;
  storeState?: string;
  storeZipCode?: string;
}

interface AuthResult {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    role: UserRole;
    isVerified: boolean;
    createdAt: Date;
  };
  accessToken: string;
  refreshToken: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate an access token and a refresh token for the given user.
 */
const generateTokens = (user: { id: string; email: string; role: string }): TokenPair => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role } as JwtPayload,
    config.jwtSecret,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role } as JwtPayload,
    config.jwtRefreshSecret,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

/**
 * Sanitise user object for returning to the client (strips passwordHash).
 */
const sanitiseUser = (user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: UserRole;
  isVerified: boolean;
  createdAt: Date;
}) => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  phone: user.phone,
  role: user.role,
  isVerified: user.isVerified,
  createdAt: user.createdAt,
});

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Register a new user account.
 */
export const register = async (data: RegisterData): Promise<AuthResult> => {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new AppError('A user with this email already exists', 409);
  }

  // Hash the password
  const passwordHash = await bcrypt.hash(data.password, config.bcryptRounds);

  // Create the user
  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone ?? null,
      role: data.role ?? UserRole.CUSTOMER,
    },
  });

  // If registering as a store owner with store details, create the store
  if (user.role === UserRole.STORE_OWNER && data.storeName && data.storeAddress) {
    await prisma.store.create({
      data: {
        ownerId: user.id,
        name: data.storeName,
        address: data.storeAddress,
        city: data.storeCity ?? '',
        state: data.storeState ?? '',
        zipCode: data.storeZipCode ?? '',
        phone: data.phone ?? '',
        latitude: 0,
        longitude: 0,
        isActive: true,
      },
    });
  }

  // Generate tokens
  const tokens = generateTokens({ id: user.id, email: user.email, role: user.role });

  // Store the refresh token in the database
  const refreshTokenExpiry = new Date();
  refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: tokens.refreshToken,
      expiresAt: refreshTokenExpiry,
    },
  });

  return {
    user: sanitiseUser(user),
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
};

/**
 * Authenticate a user with email and password.
 */
export const login = async (email: string, password: string): Promise<AuthResult> => {
  // Find the user by email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  // Compare the password
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  // Generate tokens
  const tokens = generateTokens({ id: user.id, email: user.email, role: user.role });

  // Store the refresh token
  const refreshTokenExpiry = new Date();
  refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: tokens.refreshToken,
      expiresAt: refreshTokenExpiry,
    },
  });

  return {
    user: sanitiseUser(user),
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
};

/**
 * Refresh an access token using a valid refresh token.
 * Deletes the old refresh token and issues a new pair (rotation).
 */
export const refreshToken = async (token: string): Promise<TokenPair> => {
  // Find the refresh token in the database
  const storedToken = await prisma.refreshToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!storedToken) {
    throw new AppError('Invalid refresh token', 401);
  }

  // Check if the token has expired
  if (new Date() > storedToken.expiresAt) {
    // Delete the expired token
    await prisma.refreshToken.delete({
      where: { id: storedToken.id },
    });
    throw new AppError('Refresh token has expired. Please log in again', 401);
  }

  // Verify the JWT signature of the refresh token
  try {
    jwt.verify(token, config.jwtRefreshSecret);
  } catch {
    // Delete the invalid token
    await prisma.refreshToken.delete({
      where: { id: storedToken.id },
    });
    throw new AppError('Invalid refresh token', 401);
  }

  const { user } = storedToken;

  // Generate a new token pair
  const newTokens = generateTokens({ id: user.id, email: user.email, role: user.role });

  // Delete the old refresh token and create a new one (atomic rotation)
  const newExpiry = new Date();
  newExpiry.setDate(newExpiry.getDate() + 7);

  await prisma.$transaction([
    prisma.refreshToken.delete({ where: { id: storedToken.id } }),
    prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: newTokens.refreshToken,
        expiresAt: newExpiry,
      },
    }),
  ]);

  return newTokens;
};

/**
 * Logout by deleting the refresh token from the database.
 */
export const logout = async (refreshTokenValue: string): Promise<void> => {
  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: refreshTokenValue },
  });

  if (!storedToken) {
    throw new AppError('Invalid refresh token', 400);
  }

  await prisma.refreshToken.delete({
    where: { id: storedToken.id },
  });
};

/**
 * Change a user's password after validating the current one.
 */
export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Validate the current password
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);

  if (!isCurrentPasswordValid) {
    throw new AppError('Current password is incorrect', 401);
  }

  // Hash the new password and update
  const newPasswordHash = await bcrypt.hash(newPassword, config.bcryptRounds);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash },
  });

  // Invalidate all existing refresh tokens for this user
  await prisma.refreshToken.deleteMany({
    where: { userId },
  });
};
