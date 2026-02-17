/**
 * Jest Global Test Setup
 *
 * This file is loaded before every test suite. It mocks the Prisma client
 * globally so that no real database connections are made during unit and
 * integration tests.
 */

// ---------------------------------------------------------------------------
// Mock Prisma Client
// ---------------------------------------------------------------------------

const mockModelMethods = () => ({
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  createMany: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  upsert: jest.fn(),
  delete: jest.fn(),
  deleteMany: jest.fn(),
  count: jest.fn(),
  aggregate: jest.fn(),
  groupBy: jest.fn(),
});

export const prismaMock = {
  user: mockModelMethods(),
  store: mockModelMethods(),
  product: mockModelMethods(),
  category: mockModelMethods(),
  order: mockModelMethods(),
  orderItem: mockModelMethods(),
  review: mockModelMethods(),
  notification: mockModelMethods(),
  refreshToken: mockModelMethods(),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $transaction: jest.fn((fn: any) => {
    if (typeof fn === 'function') {
      return fn(prismaMock);
    }
    return Promise.all(fn);
  }),
  $queryRaw: jest.fn(),
  $executeRaw: jest.fn(),
};

// Mock the database module to return our mock client
jest.mock('../src/config/database', () => ({
  __esModule: true,
  default: prismaMock,
  prisma: prismaMock,
  connectDatabase: jest.fn(),
  disconnectDatabase: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Set test environment variables
// ---------------------------------------------------------------------------
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
process.env.JWT_EXPIRY = '15m';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.BCRYPT_ROUNDS = '4'; // Low rounds for faster tests
process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fake_secret';
process.env.CORS_ORIGIN = 'http://localhost:5173';
