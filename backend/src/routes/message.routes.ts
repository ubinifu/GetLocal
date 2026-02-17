import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate, validateQuery } from '../middleware/validate';
import {
  sendMessageSchema,
  messageQuerySchema,
} from '../validators/message.validator';
import * as messageController from '../controllers/message.controller';

const router = Router();

// POST /orders/:orderId/messages - Send a message (authenticated)
router.post(
  '/orders/:orderId/messages',
  authenticate,
  validate(sendMessageSchema),
  messageController.sendMessage
);

// GET /orders/:orderId/messages - Get messages for an order (authenticated)
router.get(
  '/orders/:orderId/messages',
  authenticate,
  validateQuery(messageQuerySchema),
  messageController.getMessages
);

// PUT /messages/:id/read - Mark a message as read (authenticated)
router.put(
  '/messages/:id/read',
  authenticate,
  messageController.markAsRead
);

export default router;
