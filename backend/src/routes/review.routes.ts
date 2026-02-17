import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createReviewSchema } from '../validators/review.validator';
import * as reviewController from '../controllers/review.controller';

const router = Router();

// POST / - Create a new review (authenticated users)
router.post(
  '/',
  authenticate,
  validate(createReviewSchema),
  reviewController.createReview
);

// GET /store/:storeId - List reviews for a store (public)
router.get(
  '/store/:storeId',
  reviewController.getReviewsByStore
);

// DELETE /:id - Delete a review (authenticated, own review only)
router.delete(
  '/:id',
  authenticate,
  reviewController.deleteReview
);

export default router;
