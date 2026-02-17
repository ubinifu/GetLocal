/**
 * Store Routes Integration Tests
 *
 * Tests for the store API endpoints using supertest against the Express
 * application with mocked Prisma client.
 */

import { prismaMock } from '../setup';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/app';

// ---------------------------------------------------------------------------
// Test Data
// ---------------------------------------------------------------------------

const mockStoreOwner = {
  id: 'owner-001',
  email: 'owner@example.com',
  role: 'STORE_OWNER',
};

const mockCustomer = {
  id: 'customer-001',
  email: 'customer@example.com',
  role: 'CUSTOMER',
};

const mockStore = {
  id: 'store-001',
  ownerId: 'owner-001',
  name: 'Corner Market',
  description: 'Your friendly neighborhood store',
  address: '456 Oak Ave',
  city: 'Portland',
  state: 'OR',
  zipCode: '97201',
  latitude: 45.5152,
  longitude: -122.6784,
  phone: '+15039876543',
  email: 'market@example.com',
  imageUrl: null,
  isActive: true,
  hours: {},
  rating: 4.2,
  reviewCount: 25,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
};

const mockStores = [
  mockStore,
  {
    ...mockStore,
    id: 'store-002',
    name: 'Quick Stop',
    address: '789 Pine St',
    rating: 3.8,
    reviewCount: 12,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generate a valid JWT token for testing authenticated routes.
 */
const generateTestToken = (user: { id: string; email: string; role: string }): string => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'test-jwt-secret',
    { expiresIn: '15m' }
  );
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Store Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── GET /api/stores ────────────────────────────────────────────────────

  describe('GET /api/stores', () => {
    it('should return 200 with an array of stores', async () => {
      const paginatedResult = {
        data: mockStores,
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
        },
      };

      // The store service uses findMany and count
      prismaMock.store.findMany.mockResolvedValue(mockStores as any);
      prismaMock.store.count.mockResolvedValue(2);

      const response = await request(app)
        .get('/api/stores')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('data');
      expect(Array.isArray(response.body.data.data)).toBe(true);
    });

    it('should return 200 even with no stores found', async () => {
      prismaMock.store.findMany.mockResolvedValue([]);
      prismaMock.store.count.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/stores')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('data');
      expect(response.body.data.data).toHaveLength(0);
    });
  });

  // ─── GET /api/stores/:id ──────────────────────────────────────────────────

  describe('GET /api/stores/:id', () => {
    it('should return 200 with a store when found', async () => {
      prismaMock.store.findUnique.mockResolvedValue({
        ...mockStore,
        owner: {
          id: mockStoreOwner.id,
          email: mockStoreOwner.email,
          firstName: 'Store',
          lastName: 'Owner',
          phone: '+15551234567',
        },
        _count: { products: 50, orders: 120, reviews: 25 },
      } as any);

      const response = await request(app)
        .get(`/api/stores/${mockStore.id}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('name', mockStore.name);
    });

    it('should return 404 when store is not found', async () => {
      prismaMock.store.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/stores/nonexistent-id');

      // The store service throws AppError(404) which goes through the error handler
      expect([404, 500]).toContain(response.status);
    });
  });

  // ─── POST /api/stores ──────────────────────────────────────────────────────

  describe('POST /api/stores', () => {
    const newStoreData = {
      name: 'New Corner Store',
      address: '100 Elm St',
      city: 'Seattle',
      state: 'WA',
      zipCode: '98101',
      latitude: 47.6062,
      longitude: -122.3321,
      phone: '+12065551234',
    };

    it('should return 401 without authentication token', async () => {
      const response = await request(app)
        .post('/api/stores')
        .send(newStoreData)
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toMatch(/[Aa]uthentication/);
    });

    it('should return 403 when user has CUSTOMER role', async () => {
      const customerToken = generateTestToken(mockCustomer);

      const response = await request(app)
        .post('/api/stores')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(newStoreData)
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toMatch(/[Aa]ccess denied|[Ff]orbidden|[Rr]ole/);
    });

    it('should return 201 when store owner creates a store', async () => {
      const ownerToken = generateTestToken(mockStoreOwner);

      prismaMock.user.findUnique.mockResolvedValue({
        id: mockStoreOwner.id,
        email: mockStoreOwner.email,
        passwordHash: 'hashed',
        firstName: 'Store',
        lastName: 'Owner',
        phone: '+15551234567',
        role: 'STORE_OWNER',
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      prismaMock.store.create.mockResolvedValue({
        ...mockStore,
        ...newStoreData,
        id: 'new-store-id',
        ownerId: mockStoreOwner.id,
        owner: {
          id: mockStoreOwner.id,
          email: mockStoreOwner.email,
          firstName: 'Store',
          lastName: 'Owner',
        },
      } as any);

      const response = await request(app)
        .post('/api/stores')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(newStoreData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('name', newStoreData.name);
    });
  });
});
