import { Request, Response, NextFunction } from 'express';
import * as orderService from '../services/order.service';

// ─── createOrder ────────────────────────────────────────────────────────────

export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const order = await orderService.createOrder(req.user!.id, req.body);

    res.status(201).json({
      status: 'success',
      message: 'Order created successfully.',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// ─── getOrderById ───────────────────────────────────────────────────────────

export const getOrderById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const order = await orderService.getOrderById(
      req.params.id as string,
      req.user!.id,
      req.user!.role
    );

    res.status(200).json({
      status: 'success',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// ─── getOrders ──────────────────────────────────────────────────────────────

export const getOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await orderService.getOrders(
      req.user!.id,
      req.user!.role,
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

// ─── updateOrderStatus ─────────────────────────────────────────────────────

export const updateOrderStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status } = req.body;
    const order = await orderService.updateOrderStatus(
      req.params.id as string,
      req.user!.id,
      status
    );

    res.status(200).json({
      status: 'success',
      message: 'Order status updated successfully.',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// ─── getOrderStats ──────────────────────────────────────────────────────────

export const getOrderStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await orderService.getOrderStats(
      req.params.storeId as string,
      req.user!.id
    );

    res.status(200).json({
      status: 'success',
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

// ─── reorder ────────────────────────────────────────────────────────────────

export const reorder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await orderService.reorderFromPast(
      req.params.id as string,
      req.user!.id
    );

    res.status(201).json({
      status: 'success',
      message: 'Reorder created successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ─── checkIn ────────────────────────────────────────────────────────────────

export const checkIn = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const order = await orderService.checkIn(
      req.params.id as string,
      req.user!.id
    );

    res.status(200).json({
      status: 'success',
      message: 'Check-in successful.',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// ─── verifyPickup ───────────────────────────────────────────────────────────

export const verifyPickup = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { pickupCode } = req.body;
    const order = await orderService.verifyPickup(
      req.params.id as string,
      req.user!.id,
      pickupCode
    );

    res.status(200).json({
      status: 'success',
      message: 'Pickup verified successfully.',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// ─── setEstimatedTime ───────────────────────────────────────────────────────

export const setEstimatedTime = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { minutes } = req.body;
    const order = await orderService.setEstimatedReadyTime(
      req.params.id as string,
      req.user!.id,
      minutes
    );

    res.status(200).json({
      status: 'success',
      message: 'Estimated ready time updated.',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};
