import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate, validateQuery } from '../middleware/validate';
import {
  adminUserQuerySchema,
  adminUpdateUserSchema,
  adminStoreQuerySchema,
  adminUpdateStoreSchema,
  adminOrderQuerySchema,
  adminCreateCategorySchema,
  adminUpdateCategorySchema,
} from '../validators/admin.validator';
import * as adminController from '../controllers/admin.controller';

const router = Router();

// All admin routes require authentication + ADMIN role.
router.use(authenticate, authorize('ADMIN'));

// ─── Dashboard ──────────────────────────────────────────────────────────────

router.get('/dashboard', adminController.getDashboardStats);

// ─── Users ──────────────────────────────────────────────────────────────────

router.get('/users', validateQuery(adminUserQuerySchema), adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', validate(adminUpdateUserSchema), adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// ─── Stores ─────────────────────────────────────────────────────────────────

router.get('/stores', validateQuery(adminStoreQuerySchema), adminController.getStores);
router.put('/stores/:id', validate(adminUpdateStoreSchema), adminController.updateStore);
router.delete('/stores/:id', adminController.deleteStore);

// ─── Orders ─────────────────────────────────────────────────────────────────

router.get('/orders', validateQuery(adminOrderQuerySchema), adminController.getOrders);

// ─── Categories ─────────────────────────────────────────────────────────────

router.get('/categories', adminController.getCategories);
router.post('/categories', validate(adminCreateCategorySchema), adminController.createCategory);
router.put('/categories/:id', validate(adminUpdateCategorySchema), adminController.updateCategory);
router.delete('/categories/:id', adminController.deleteCategory);

export default router;
