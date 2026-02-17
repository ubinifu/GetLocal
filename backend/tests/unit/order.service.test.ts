/**
 * Order Service Unit Tests
 *
 * Tests for the order service functions including createOrder,
 * updateOrderStatus, and related validation logic.
 */

import { prismaMock } from '../setup';
import * as orderService from '../../src/services/order.service';
import { AppError } from '../../src/middleware/errorHandler';
import { Prisma } from '@prisma/client';

// ---------------------------------------------------------------------------
// Test Data
// ---------------------------------------------------------------------------

const mockStore = {
  id: 'store-001',
  ownerId: 'owner-001',
  name: 'Test Corner Store',
  description: 'A local corner store',
  address: '123 Main St',
  city: 'Springfield',
  state: 'IL',
  zipCode: '62701',
  latitude: 39.7817,
  longitude: -89.6501,
  phone: '+15551234567',
  email: 'store@example.com',
  imageUrl: null,
  isActive: true,
  hours: {},
  rating: 4.5,
  reviewCount: 10,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
};

const mockProducts = [
  {
    id: 'product-001',
    storeId: 'store-001',
    categoryId: 'cat-001',
    name: 'Milk',
    description: 'Fresh whole milk',
    price: new Prisma.Decimal('3.99'),
    compareAtPrice: null,
    imageUrl: null,
    sku: 'MILK-001',
    barcode: null,
    stockQuantity: 20,
    lowStockThreshold: 5,
    isActive: true,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
  },
  {
    id: 'product-002',
    storeId: 'store-001',
    categoryId: 'cat-001',
    name: 'Bread',
    description: 'White bread loaf',
    price: new Prisma.Decimal('2.50'),
    compareAtPrice: null,
    imageUrl: null,
    sku: 'BREAD-001',
    barcode: null,
    stockQuantity: 15,
    lowStockThreshold: 3,
    isActive: true,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
  },
];

const customerId = 'customer-001';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Order Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── createOrder ──────────────────────────────────────────────────────────

  describe('createOrder', () => {
    it('should throw 400 if order has no items', async () => {
      const orderData = {
        storeId: mockStore.id,
        items: [],
      };

      await expect(
        orderService.createOrder(customerId, orderData)
      ).rejects.toThrow(AppError);

      await expect(
        orderService.createOrder(customerId, orderData)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('at least one item'),
      });
    });

    it('should throw 404 if store is not found', async () => {
      prismaMock.store.findUnique.mockResolvedValue(null);

      const orderData = {
        storeId: 'nonexistent-store',
        items: [{ productId: 'product-001', quantity: 1 }],
      };

      await expect(
        orderService.createOrder(customerId, orderData)
      ).rejects.toThrow(AppError);

      await expect(
        orderService.createOrder(customerId, orderData)
      ).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('should throw 400 if store is inactive', async () => {
      prismaMock.store.findUnique.mockResolvedValue({
        ...mockStore,
        isActive: false,
      });

      const orderData = {
        storeId: mockStore.id,
        items: [{ productId: 'product-001', quantity: 1 }],
      };

      await expect(
        orderService.createOrder(customerId, orderData)
      ).rejects.toThrow(AppError);

      await expect(
        orderService.createOrder(customerId, orderData)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('not accepting orders'),
      });
    });

    it('should throw 404 if a product is not found or inactive', async () => {
      prismaMock.store.findUnique.mockResolvedValue(mockStore);
      prismaMock.product.findMany.mockResolvedValue([]); // No products found

      const orderData = {
        storeId: mockStore.id,
        items: [{ productId: 'nonexistent-product', quantity: 1 }],
      };

      await expect(
        orderService.createOrder(customerId, orderData)
      ).rejects.toThrow(AppError);

      await expect(
        orderService.createOrder(customerId, orderData)
      ).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('should throw 400 if product has insufficient stock', async () => {
      prismaMock.store.findUnique.mockResolvedValue(mockStore);
      prismaMock.product.findMany.mockResolvedValue([mockProducts[0]]);

      const orderData = {
        storeId: mockStore.id,
        items: [{ productId: 'product-001', quantity: 100 }], // More than available stock (20)
      };

      await expect(
        orderService.createOrder(customerId, orderData)
      ).rejects.toThrow(AppError);

      await expect(
        orderService.createOrder(customerId, orderData)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('Insufficient stock'),
      });
    });

    it('should calculate totals correctly with 8.5% tax', async () => {
      prismaMock.store.findUnique.mockResolvedValue(mockStore);
      prismaMock.product.findMany.mockResolvedValue(mockProducts);

      // Mock the transaction to capture the order data
      let capturedOrderData: any = null;
      prismaMock.$transaction.mockImplementation(async (fn: any) => {
        const txMock = {
          order: {
            create: jest.fn().mockImplementation((args: any) => {
              capturedOrderData = args.data;
              return {
                id: 'order-001',
                orderNumber: 'GL-TEST-001',
                ...args.data,
                items: [],
                store: mockStore,
              };
            }),
          },
          product: {
            update: jest.fn().mockResolvedValue({}),
          },
        };
        return fn(txMock);
      });

      // Mock notification creation (called after transaction)
      prismaMock.notification.create.mockResolvedValue({} as any);

      const orderData = {
        storeId: mockStore.id,
        items: [
          { productId: 'product-001', quantity: 2 }, // 2 x $3.99 = $7.98
          { productId: 'product-002', quantity: 3 }, // 3 x $2.50 = $7.50
        ],
      };

      await orderService.createOrder(customerId, orderData);

      // Verify calculations
      // Subtotal: $7.98 + $7.50 = $15.48
      // Tax (8.5%): $15.48 * 0.085 = $1.3158 -> rounded to $1.32
      // Total: $15.48 + $1.32 = $16.80

      expect(capturedOrderData).not.toBeNull();
      const subtotal = Number(capturedOrderData.subtotal);
      const tax = Number(capturedOrderData.tax);
      const total = Number(capturedOrderData.total);

      expect(subtotal).toBeCloseTo(15.48, 2);
      expect(tax).toBeCloseTo(15.48 * 0.085, 2);
      expect(total).toBeCloseTo(subtotal + tax, 2);
    });

    it('should throw 400 if products belong to a different store', async () => {
      prismaMock.store.findUnique.mockResolvedValue(mockStore);

      // Return a product that belongs to a different store
      const wrongStoreProduct = {
        ...mockProducts[0],
        storeId: 'different-store-id',
      };
      prismaMock.product.findMany.mockResolvedValue([wrongStoreProduct]);

      const orderData = {
        storeId: mockStore.id,
        items: [{ productId: 'product-001', quantity: 1 }],
      };

      await expect(
        orderService.createOrder(customerId, orderData)
      ).rejects.toThrow(AppError);

      await expect(
        orderService.createOrder(customerId, orderData)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('must belong to the specified store'),
      });
    });
  });

  // ─── updateOrderStatus ──────────────────────────────────────────────────────

  describe('updateOrderStatus', () => {
    const mockOrder = {
      id: 'order-001',
      orderNumber: 'GL-TEST-001',
      customerId: 'customer-001',
      storeId: 'store-001',
      status: 'PENDING' as const,
      subtotal: new Prisma.Decimal('15.48'),
      tax: new Prisma.Decimal('1.32'),
      total: new Prisma.Decimal('16.80'),
      pickupTime: null,
      notes: null,
      stripePaymentIntentId: null,
      createdAt: new Date('2025-01-15T10:00:00Z'),
      updatedAt: new Date('2025-01-15T10:00:00Z'),
      store: {
        id: 'store-001',
        name: 'Test Corner Store',
        ownerId: 'owner-001',
      },
    };

    it('should allow valid status transitions (PENDING -> CONFIRMED)', async () => {
      prismaMock.order.findUnique.mockResolvedValue(mockOrder);
      prismaMock.order.update.mockResolvedValue({
        ...mockOrder,
        status: 'CONFIRMED',
        items: [],
        store: { id: mockOrder.storeId, name: 'Test Corner Store', address: '123 Main St' },
      });
      prismaMock.notification.create.mockResolvedValue({} as any);

      const result = await orderService.updateOrderStatus(
        'order-001',
        'owner-001',
        'CONFIRMED' as any
      );

      expect(result.status).toBe('CONFIRMED');
      expect(prismaMock.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-001' },
          data: { status: 'CONFIRMED' },
        })
      );
    });

    it('should throw 400 for invalid status transitions (PENDING -> READY)', async () => {
      prismaMock.order.findUnique.mockResolvedValue(mockOrder);

      await expect(
        orderService.updateOrderStatus('order-001', 'owner-001', 'READY' as any)
      ).rejects.toThrow(AppError);

      await expect(
        orderService.updateOrderStatus('order-001', 'owner-001', 'READY' as any)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('Cannot transition'),
      });
    });

    it('should throw 400 for transitions from terminal states (PICKED_UP -> any)', async () => {
      const pickedUpOrder = {
        ...mockOrder,
        status: 'PICKED_UP' as const,
      };
      prismaMock.order.findUnique.mockResolvedValue(pickedUpOrder);

      await expect(
        orderService.updateOrderStatus('order-001', 'owner-001', 'CANCELLED' as any)
      ).rejects.toThrow(AppError);

      await expect(
        orderService.updateOrderStatus('order-001', 'owner-001', 'CANCELLED' as any)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('terminal state'),
      });
    });

    it('should throw 403 if user is not the store owner', async () => {
      prismaMock.order.findUnique.mockResolvedValue(mockOrder);

      await expect(
        orderService.updateOrderStatus('order-001', 'different-owner', 'CONFIRMED' as any)
      ).rejects.toThrow(AppError);

      await expect(
        orderService.updateOrderStatus('order-001', 'different-owner', 'CONFIRMED' as any)
      ).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it('should throw 404 if order is not found', async () => {
      prismaMock.order.findUnique.mockResolvedValue(null);

      await expect(
        orderService.updateOrderStatus('nonexistent', 'owner-001', 'CONFIRMED' as any)
      ).rejects.toThrow(AppError);

      await expect(
        orderService.updateOrderStatus('nonexistent', 'owner-001', 'CONFIRMED' as any)
      ).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });
});
