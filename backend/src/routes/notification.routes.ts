import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as notificationController from '../controllers/notification.controller';

const router = Router();

// GET / - List notifications for the authenticated user
router.get(
  '/',
  authenticate,
  notificationController.getNotifications
);

// GET /unread-count - Get the count of unread notifications
router.get(
  '/unread-count',
  authenticate,
  notificationController.getUnreadCount
);

// PUT /read-all - Mark all notifications as read
// NOTE: This route must be defined before /:id/read to avoid matching "read-all" as an id.
router.put(
  '/read-all',
  authenticate,
  notificationController.markAllAsRead
);

// PUT /:id/read - Mark a single notification as read
router.put(
  '/:id/read',
  authenticate,
  notificationController.markAsRead
);

export default router;
