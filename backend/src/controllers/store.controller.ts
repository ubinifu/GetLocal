import { Request, Response, NextFunction } from 'express';
import * as storeService from '../services/store.service';

// ─── createStore ────────────────────────────────────────────────────────────

export const createStore = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const store = await storeService.createStore(req.user!.id, req.body);

    res.status(201).json({
      status: 'success',
      message: 'Store created successfully.',
      data: store,
    });
  } catch (error) {
    next(error);
  }
};

// ─── getStores ──────────────────────────────────────────────────────────────

export const getStores = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await storeService.getStores(req.query as any);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ─── getStoreById ───────────────────────────────────────────────────────────

export const getStoreById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const store = await storeService.getStoreById(req.params.id as string);

    res.status(200).json({
      status: 'success',
      data: store,
    });
  } catch (error) {
    next(error);
  }
};

// ─── getMyStores ────────────────────────────────────────────────────────────

export const getMyStores = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stores = await storeService.getStoresByOwner(req.user!.id);

    res.status(200).json({
      status: 'success',
      data: stores,
    });
  } catch (error) {
    next(error);
  }
};

// ─── updateStore ────────────────────────────────────────────────────────────

export const updateStore = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const store = await storeService.updateStore(
      req.params.id as string,
      req.user!.id,
      req.body
    );

    res.status(200).json({
      status: 'success',
      message: 'Store updated successfully.',
      data: store,
    });
  } catch (error) {
    next(error);
  }
};

// ─── deleteStore ────────────────────────────────────────────────────────────

export const deleteStore = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await storeService.deleteStore(req.params.id as string, req.user!.id);

    res.status(200).json({
      status: 'success',
      message: 'Store deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
