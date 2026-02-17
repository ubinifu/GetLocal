import { Request, Response, NextFunction } from 'express';
import * as messageService from '../services/message.service';

// ─── sendMessage ────────────────────────────────────────────────────────────

export const sendMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const message = await messageService.sendMessage(
      req.params.orderId as string,
      req.user!.id,
      req.user!.role,
      req.body
    );

    res.status(201).json({
      status: 'success',
      message: 'Message sent successfully.',
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

// ─── getMessages ────────────────────────────────────────────────────────────

export const getMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await messageService.getMessages(
      req.params.orderId as string,
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

// ─── markAsRead ─────────────────────────────────────────────────────────────

export const markAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const message = await messageService.markAsRead(
      req.params.id as string,
      req.user!.id
    );

    res.status(200).json({
      status: 'success',
      message: 'Message marked as read.',
      data: message,
    });
  } catch (error) {
    next(error);
  }
};
