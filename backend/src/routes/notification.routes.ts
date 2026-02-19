import { Router, Request, Response, NextFunction } from 'express';
import notificationService from '../services/notificationService';
import { authenticate } from '../middleware/auth';
import { generalLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * GET /api/notifications
 * Get user's notifications with pagination
 */
router.get(
  '/',
  authenticate,
  generalLimiter,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as 'read' | 'unread' | undefined;

      const result = await notificationService.getNotifications(
        req.user!.userId,
        { page, limit },
        status
      );

      res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/notifications/unread-count
 * Get unread notification count
 */
router.get(
  '/unread-count',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const count = await notificationService.getUnreadCount(req.user!.userId);

      res.status(200).json({ count });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * PUT /api/notifications/:id/read
 * Mark notification as read
 */
router.put(
  '/:id/read',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const id = req.params.id as string;

      await notificationService.markAsRead(id, req.user!.userId);

      res.status(200).json({ message: 'Notification marked as read' });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
router.put(
  '/read-all',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      await notificationService.markAllAsRead(req.user!.userId);

      res.status(200).json({ message: 'All notifications marked as read' });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const id = req.params.id as string;

      await notificationService.deleteNotification(id, req.user!.userId);

      res.status(200).json({ message: 'Notification deleted successfully' });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * DELETE /api/notifications/read-all
 * Delete all read notifications
 */
router.delete(
  '/read-all',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      await notificationService.deleteAllRead(req.user!.userId);

      res.status(200).json({ message: 'All read notifications deleted' });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
