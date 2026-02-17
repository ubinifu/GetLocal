import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate, validateQuery } from '../middleware/validate';
import {
  createFavoriteSchema,
  favoriteQuerySchema,
} from '../validators/favorite.validator';
import * as favoriteController from '../controllers/favorite.controller';

const router = Router();

// POST / - Add a favorite (authenticated)
router.post(
  '/',
  authenticate,
  validate(createFavoriteSchema),
  favoriteController.addFavorite
);

// GET / - List my favorites with optional type filter (authenticated)
router.get(
  '/',
  authenticate,
  validateQuery(favoriteQuerySchema),
  favoriteController.getFavorites
);

// DELETE /:id - Remove a favorite (authenticated, own favorites only)
router.delete(
  '/:id',
  authenticate,
  favoriteController.removeFavorite
);

export default router;
