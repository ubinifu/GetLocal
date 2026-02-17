import { Request, Response, NextFunction } from 'express';
import * as reviewService from '../services/review.service';

// ─── createReview ───────────────────────────────────────────────────────────

export const createReview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const review = await reviewService.createReview(req.user!.id, req.body);

    res.status(201).json({
      status: 'success',
      message: 'Review created successfully.',
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

// ─── getReviewsByStore ──────────────────────────────────────────────────────

export const getReviewsByStore = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reviews = await reviewService.getReviewsByStore(req.params.storeId as string);

    res.status(200).json({
      status: 'success',
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};

// ─── deleteReview ───────────────────────────────────────────────────────────

export const deleteReview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await reviewService.deleteReview(req.params.id as string, req.user!.id);

    res.status(200).json({
      status: 'success',
      message: 'Review deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
