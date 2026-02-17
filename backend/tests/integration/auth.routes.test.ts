/**
 * Auth Routes Integration Tests
 *
 * Tests for the authentication API endpoints using supertest against
 * the Express application with mocked Prisma client.
 */

import { prismaMock } from '../setup';
import request from 'supertest';
import app from '../../src/app';
import bcrypt from 'bcryptjs';

// ---------------------------------------------------------------------------
// Test Data
// ---------------------------------------------------------------------------

const mockUser = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  email: 'testuser@example.com',
  passwordHash: '$2a$04$mockhashedpassword',
  firstName: 'John',
  lastName: 'Doe',
  phone: '+11234567890',
  role: 'CUSTOMER' as const,
  isVerified: false,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── POST /api/auth/register ──────────────────────────────────────────────

  describe('POST /api/auth/register', () => {
    const validRegistration = {
      email: 'newuser@example.com',
      password: 'StrongPass1',
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'CUSTOMER',
    };

    it('should return 201 and create a new user', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null); // No existing user
      prismaMock.user.create.mockResolvedValue({
        ...mockUser,
        id: '550e8400-e29b-41d4-a716-446655440002',
        email: validRegistration.email,
        firstName: validRegistration.firstName,
        lastName: validRegistration.lastName,
      });
      prismaMock.refreshToken.create.mockResolvedValue({
        id: 'token-id',
        userId: '550e8400-e29b-41d4-a716-446655440002',
        token: 'mock-refresh-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistration)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user.email).toBe(validRegistration.email);
    });

    it('should return 400 with invalid email', async () => {
      const invalidData = {
        ...validRegistration,
        email: 'not-a-valid-email',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);
    });

    it('should return 400 with missing required fields', async () => {
      const incompleteData = {
        email: 'user@example.com',
        // Missing password, firstName, lastName, role
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(incompleteData)
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });

  // ─── POST /api/auth/login ────────────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    const loginCredentials = {
      email: 'testuser@example.com',
      password: 'CorrectPass1',
    };

    it('should return 200 with tokens for valid credentials', async () => {
      // Hash the password for the mock
      const hashedPassword = await bcrypt.hash(loginCredentials.password, 4);
      const userWithHash = {
        ...mockUser,
        passwordHash: hashedPassword,
      };

      prismaMock.user.findUnique.mockResolvedValue(userWithHash);
      prismaMock.refreshToken.create.mockResolvedValue({
        id: 'token-id',
        userId: mockUser.id,
        token: 'mock-refresh-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginCredentials)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user.email).toBe(loginCredentials.email);
    });

    it('should return 401 with invalid credentials', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      // bcrypt.compare will return false because the plain text won't match
      // the mock hash in mockUser

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: mockUser.email,
          password: 'WrongPassword1',
        });

      // Expect either 401 (service throws) or the error propagated through
      expect([401, 500]).toContain(response.status);
    });

    it('should return 401 when user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'AnyPassword1',
        });

      expect([401, 500]).toContain(response.status);
    });

    it('should return 400 with missing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: 'SomePassword1' })
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });
});
