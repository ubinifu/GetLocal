/**
 * Auth Service Unit Tests
 *
 * Tests for the authentication service functions including register, login,
 * refreshToken, and related operations.
 */

import { prismaMock } from '../setup';

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
  TokenExpiredError: class TokenExpiredError extends Error {
    expiredAt: Date;
    constructor(message: string, expiredAt: Date) {
      super(message);
      this.name = 'TokenExpiredError';
      this.expiredAt = expiredAt;
    }
  },
  JsonWebTokenError: class JsonWebTokenError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'JsonWebTokenError';
    }
  },
}));

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as authService from '../../src/services/auth.service';
import { AppError } from '../../src/middleware/errorHandler';

// ---------------------------------------------------------------------------
// Test Data
// ---------------------------------------------------------------------------

const mockUser = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  email: 'test@example.com',
  passwordHash: '$2a$12$hashedpassword',
  firstName: 'John',
  lastName: 'Doe',
  phone: '+11234567890',
  role: 'CUSTOMER' as const,
  isVerified: false,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
};

const mockTokens = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default token generation mock
    (jwt.sign as jest.Mock)
      .mockReturnValueOnce(mockTokens.accessToken)
      .mockReturnValueOnce(mockTokens.refreshToken);
  });

  // ─── register ───────────────────────────────────────────────────────────────

  describe('register', () => {
    const registerData = {
      email: 'newuser@example.com',
      password: 'StrongPass1',
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'CUSTOMER' as const,
    };

    it('should create a new user and return tokens', async () => {
      const createdUser = {
        ...mockUser,
        id: '550e8400-e29b-41d4-a716-446655440002',
        email: registerData.email,
        firstName: registerData.firstName,
        lastName: registerData.lastName,
      };

      prismaMock.user.findUnique.mockResolvedValue(null); // No existing user
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2a$04$newhashedpassword');
      prismaMock.user.create.mockResolvedValue(createdUser);
      prismaMock.refreshToken.create.mockResolvedValue({
        id: 'token-id',
        userId: createdUser.id,
        token: mockTokens.refreshToken,
        expiresAt: new Date(),
        createdAt: new Date(),
      });

      const result = await authService.register(registerData);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(registerData.email);
      expect(result.user.firstName).toBe(registerData.firstName);
      expect(result.accessToken).toBe(mockTokens.accessToken);
      expect(result.refreshToken).toBe(mockTokens.refreshToken);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerData.email },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(registerData.password, expect.any(Number));
      expect(prismaMock.user.create).toHaveBeenCalled();
      expect(prismaMock.refreshToken.create).toHaveBeenCalled();
    });

    it('should throw 409 if user with email already exists', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      await expect(authService.register(registerData)).rejects.toThrow(AppError);
      await expect(authService.register(registerData)).rejects.toMatchObject({
        statusCode: 409,
      });

      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });
  });

  // ─── login ──────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('should return user and tokens with valid credentials', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prismaMock.refreshToken.create.mockResolvedValue({
        id: 'token-id',
        userId: mockUser.id,
        token: mockTokens.refreshToken,
        expiresAt: new Date(),
        createdAt: new Date(),
      });

      const result = await authService.login(mockUser.email, 'correctPassword');

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(mockUser.email);
      expect(result.accessToken).toBe(mockTokens.accessToken);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: mockUser.email },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('correctPassword', mockUser.passwordHash);
    });

    it('should throw 401 when user is not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login('nonexistent@example.com', 'anyPassword')
      ).rejects.toThrow(AppError);

      await expect(
        authService.login('nonexistent@example.com', 'anyPassword')
      ).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    it('should throw 401 when password is incorrect', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.login(mockUser.email, 'wrongPassword')
      ).rejects.toThrow(AppError);

      await expect(
        authService.login(mockUser.email, 'wrongPassword')
      ).rejects.toMatchObject({
        statusCode: 401,
      });
    });
  });

  // ─── refreshToken ───────────────────────────────────────────────────────────

  describe('refreshToken', () => {
    const storedRefreshToken = {
      id: 'stored-token-id',
      userId: mockUser.id,
      token: 'valid-refresh-token',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      createdAt: new Date(),
      user: mockUser,
    };

    it('should return new tokens with a valid refresh token', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue(storedRefreshToken);
      (jwt.verify as jest.Mock).mockReturnValue({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      prismaMock.$transaction.mockResolvedValue([{}, {}]);

      const result = await authService.refreshToken('valid-refresh-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(prismaMock.refreshToken.findUnique).toHaveBeenCalledWith({
        where: { token: 'valid-refresh-token' },
        include: { user: true },
      });
      expect(jwt.verify).toHaveBeenCalled();
    });

    it('should throw 401 when refresh token is not found in database', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue(null);

      await expect(
        authService.refreshToken('non-existent-token')
      ).rejects.toThrow(AppError);

      await expect(
        authService.refreshToken('non-existent-token')
      ).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    it('should throw 401 when refresh token has expired', async () => {
      const expiredToken = {
        ...storedRefreshToken,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      };

      prismaMock.refreshToken.findUnique.mockResolvedValue(expiredToken);
      prismaMock.refreshToken.delete.mockResolvedValue(expiredToken);

      await expect(
        authService.refreshToken('expired-refresh-token')
      ).rejects.toThrow(AppError);

      await expect(
        authService.refreshToken('expired-refresh-token')
      ).rejects.toMatchObject({
        statusCode: 401,
      });

      // The expired token should be deleted
      expect(prismaMock.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: storedRefreshToken.id },
      });
    });
  });
});
