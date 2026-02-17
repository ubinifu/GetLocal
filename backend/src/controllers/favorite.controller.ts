import { Request, Response, NextFunction } from 'express';
import * as favoriteService from '../services/favorite.service';

// ─── addFavorite ────────────────────────────────────────────────────────────

export const addFavorite = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const favorite = await favoriteService.addFavorite(req.user!.id, req.body);

    res.status(201).json({
      status: 'success',
      message: 'Favorite added successfully.',
      data: favorite,
    });
  } catch (error) {
    next(error);
  }
};

// ─── getFavorites ───────────────────────────────────────────────────────────

export const getFavorites = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await favoriteService.getFavorites(
      req.user!.id,
      req.query as any
    );

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ─── removeFavorite ─────────────────────────────────────────────────────────

export const removeFavorite = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await favoriteService.removeFavorite(req.params.id as string, req.user!.id);

    res.status(200).json({
      status: 'success',
      message: 'Favorite removed successfully.',
    });
  } catch (error) {
    next(error);
  }
};
