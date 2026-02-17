import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate, validateQuery } from '../middleware/validate';
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
} from '../validators/product.validator';
import * as productController from '../controllers/product.controller';

const router = Router();

// GET /store/:storeId - List products for a store with optional filters (public)
router.get(
  '/store/:storeId',
  validateQuery(productQuerySchema),
  productController.getProductsByStore
);

// GET /:id - Get a single product by ID (public)
router.get(
  '/:id',
  productController.getProductById
);

// POST /store/:storeId - Create a new product for a store (store owners only)
router.post(
  '/store/:storeId',
  authenticate,
  authorize('STORE_OWNER'),
  validate(createProductSchema),
  productController.createProduct
);

// PUT /:id - Update a product (store owners only)
router.put(
  '/:id',
  authenticate,
  authorize('STORE_OWNER'),
  validate(updateProductSchema),
  productController.updateProduct
);

// DELETE /:id - Delete a product (store owners only)
router.delete(
  '/:id',
  authenticate,
  authorize('STORE_OWNER'),
  productController.deleteProduct
);

// PATCH /:id/stock - Update product stock quantity (store owners only)
router.patch(
  '/:id/stock',
  authenticate,
  authorize('STORE_OWNER'),
  productController.updateStock
);

export default router;
