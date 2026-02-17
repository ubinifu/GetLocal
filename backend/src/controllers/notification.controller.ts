import { Request, Response, NextFunction } from 'express';
import * as notificationService from '../services/notification.service';

// ─── getNotifications ───────────────────────────────────────────────────────

export const getNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const notifications = await notificationService.getNotifications(
      req.user!.id
    );

    res.status(200).json({
      status: 'success',
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

// ─── markAsRead ─────────────────────────────────────────────────────────────

export const markAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const notification = await notificationService.markAsRead(
      req.params.id as string,
      req.user!.id
    );

    res.status(200).json({
      status: 'success',
      message: 'Notification marked as read.',
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

// ─── markAllAsRead ──────────────────────────────────────────────────────────

export const markAllAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await notificationService.markAllAsRead(req.user!.id);

    res.status(200).json({
      status: 'success',
      message: 'All notifications marked as read.',
    });
  } catch (error) {
    next(error);
  }
};

// ─── getUnreadCount ─────────────────────────────────────────────────────────

export const getUnreadCount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const count = await notificationService.getUnreadCount(req.user!.id);

    res.status(200).json({
      status: 'success',
      data: { unreadCount: count },
    });
  } catch (error) {
    next(error);
  }
};
