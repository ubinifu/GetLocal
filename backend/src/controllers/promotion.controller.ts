import { Request, Response, NextFunction } from 'express';
import * as promotionService from '../services/promotion.service';
import * as orderService from '../services/order.service';

// ─── createPromotion ────────────────────────────────────────────────────────

export const createPromotion = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const promotion = await promotionService.createPromotion(
      req.params.storeId as string,
      req.user!.id,
      req.body
    );

    res.status(201).json({
      status: 'success',
      message: 'Promotion created successfully.',
      data: promotion,
    });
  } catch (error) {
    next(error);
  }
};

// ─── getPromotions ──────────────────────────────────────────────────────────

export const getPromotions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await promotionService.getPromotions(
      req.params.storeId as string,
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

// ─── updatePromotion ────────────────────────────────────────────────────────

export const updatePromotion = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const promotion = await promotionService.updatePromotion(
      req.params.id as string,
      req.user!.id,
      req.body
    );

    res.status(200).json({
      status: 'success',
      message: 'Promotion updated successfully.',
      data: promotion,
    });
  } catch (error) {
    next(error);
  }
};

// ─── deletePromotion ────────────────────────────────────────────────────────

export const deletePromotion = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await promotionService.deletePromotion(
      req.params.id as string,
      req.user!.id
    );

    res.status(200).json({
      status: 'success',
      message: 'Promotion deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// ─── applyCoupon ────────────────────────────────────────────────────────────

export const applyCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const order = await orderService.applyPromotion(
      req.params.orderId as string,
      req.user!.id,
      req.body.code
    );

    res.status(200).json({
      status: 'success',
      message: 'Coupon applied successfully.',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};
