import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate, validateQuery } from '../middleware/validate';
import {
  createOrderSchema,
  updateOrderStatusSchema,
  orderQuerySchema,
} from '../validators/order.validator';
import {
  estimatedTimeSchema,
  verifyPickupSchema,
} from '../validators/promotion.validator';
import * as orderController from '../controllers/order.controller';

const router = Router();

// POST / - Create a new order (authenticated customers)
router.post(
  '/',
  authenticate,
  validate(createOrderSchema),
  orderController.createOrder
);

// GET / - List orders for the authenticated user with optional filters
router.get(
  '/',
  authenticate,
  validateQuery(orderQuerySchema),
  orderController.getOrders
);

// GET /store/:storeId/stats - Get order statistics for a store (store owners only)
// NOTE: This route must be defined before /:id to avoid matching "store" as an id.
router.get(
  '/store/:storeId/stats',
  authenticate,
  authorize('STORE_OWNER'),
  orderController.getOrderStats
);

// GET /:id - Get a single order by ID (authenticated)
router.get(
  '/:id',
  authenticate,
  orderController.getOrderById
);

// PUT /:id/status - Update order status (store owners only)
router.put(
  '/:id/status',
  authenticate,
  authorize('STORE_OWNER'),
  validate(updateOrderStatusSchema),
  orderController.updateOrderStatus
);

// POST /:id/reorder - Reorder from a past order (authenticated)
router.post(
  '/:id/reorder',
  authenticate,
  orderController.reorder
);

// PUT /:id/checkin - Customer check-in for an order (authenticated)
router.put(
  '/:id/checkin',
  authenticate,
  orderController.checkIn
);

// PUT /:id/verify-pickup - Verify pickup with code (store owners only)
router.put(
  '/:id/verify-pickup',
  authenticate,
  authorize('STORE_OWNER'),
  validate(verifyPickupSchema),
  orderController.verifyPickup
);

// PUT /:id/estimated-time - Set estimated ready time (store owners only)
router.put(
  '/:id/estimated-time',
  authenticate,
  authorize('STORE_OWNER'),
  validate(estimatedTimeSchema),
  orderController.setEstimatedTime
);

export default router;
