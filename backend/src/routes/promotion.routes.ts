import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate, validateQuery } from '../middleware/validate';
import {
  createPromotionSchema,
  updatePromotionSchema,
  applyCouponSchema,
  promotionQuerySchema,
} from '../validators/promotion.validator';
import * as promotionController from '../controllers/promotion.controller';

const router = Router();

// POST /stores/:storeId/promotions - Create a promotion (store owners only)
router.post(
  '/stores/:storeId/promotions',
  authenticate,
  authorize('STORE_OWNER'),
  validate(createPromotionSchema),
  promotionController.createPromotion
);

// GET /stores/:storeId/promotions - List active promotions for a store (public)
router.get(
  '/stores/:storeId/promotions',
  validateQuery(promotionQuerySchema),
  promotionController.getPromotions
);

// PUT /promotions/:id - Update a promotion (store owners only)
router.put(
  '/promotions/:id',
  authenticate,
  authorize('STORE_OWNER'),
  validate(updatePromotionSchema),
  promotionController.updatePromotion
);

// DELETE /promotions/:id - Delete a promotion (store owners only)
router.delete(
  '/promotions/:id',
  authenticate,
  authorize('STORE_OWNER'),
  promotionController.deletePromotion
);

// POST /orders/:orderId/apply-coupon - Apply a coupon code to an order (authenticated)
router.post(
  '/orders/:orderId/apply-coupon',
  authenticate,
  validate(applyCouponSchema),
  promotionController.applyCoupon
);

export default router;
