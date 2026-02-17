import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate, validateQuery } from '../middleware/validate';
import {
  createIntegrationSchema,
  updateIntegrationSchema,
  integrationQuerySchema,
} from '../validators/integration.validator';
import * as integrationController from '../controllers/integration.controller';

const router = Router();

// All routes require authentication + STORE_OWNER role

// GET /store/:storeId/stats - Get integration stats for a store
// NOTE: This must be registered before /store/:storeId to avoid matching "stats" as :storeId
router.get(
  '/store/:storeId/stats',
  authenticate,
  authorize('STORE_OWNER'),
  integrationController.getIntegrationStats
);

// GET /store/:storeId - List integrations for a store
router.get(
  '/store/:storeId',
  authenticate,
  authorize('STORE_OWNER'),
  validateQuery(integrationQuerySchema),
  integrationController.getIntegrations
);

// POST /store/:storeId - Create an integration for a store
router.post(
  '/store/:storeId',
  authenticate,
  authorize('STORE_OWNER'),
  validate(createIntegrationSchema),
  integrationController.createIntegration
);

// GET /:id - Get a single integration by ID
router.get(
  '/:id',
  authenticate,
  authorize('STORE_OWNER'),
  integrationController.getIntegrationById
);

// PUT /:id - Update an integration
router.put(
  '/:id',
  authenticate,
  authorize('STORE_OWNER'),
  validate(updateIntegrationSchema),
  integrationController.updateIntegration
);

// DELETE /:id - Delete an integration
router.delete(
  '/:id',
  authenticate,
  authorize('STORE_OWNER'),
  integrationController.deleteIntegration
);

// POST /:id/sync - Trigger a manual sync
router.post(
  '/:id/sync',
  authenticate,
  authorize('STORE_OWNER'),
  integrationController.syncIntegration
);

export default router;
