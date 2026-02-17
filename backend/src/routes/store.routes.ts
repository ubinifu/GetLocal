import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate, validateQuery } from '../middleware/validate';
import {
  createStoreSchema,
  updateStoreSchema,
  storeQuerySchema,
} from '../validators/store.validator';
import * as storeController from '../controllers/store.controller';

const router = Router();

// GET / - List stores with optional filters (public)
router.get(
  '/',
  validateQuery(storeQuerySchema),
  storeController.getStores
);

// GET /my-stores - List stores owned by the authenticated user
router.get(
  '/my-stores',
  authenticate,
  storeController.getMyStores
);

// GET /:id - Get a single store by ID (public)
router.get(
  '/:id',
  storeController.getStoreById
);

// POST / - Create a new store (store owners only)
router.post(
  '/',
  authenticate,
  authorize('STORE_OWNER'),
  validate(createStoreSchema),
  storeController.createStore
);

// PUT /:id - Update a store (store owners only)
router.put(
  '/:id',
  authenticate,
  authorize('STORE_OWNER'),
  validate(updateStoreSchema),
  storeController.updateStore
);

// DELETE /:id - Delete a store (store owners only)
router.delete(
  '/:id',
  authenticate,
  authorize('STORE_OWNER'),
  storeController.deleteStore
);

export default router;
