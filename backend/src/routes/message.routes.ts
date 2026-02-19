import { Router, Request, Response, NextFunction } from 'express';
import directMessageService from '../services/directMessageService';
import { authenticate } from '../middleware/auth';
import { messageLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * GET /api/messages/conversations
 * Get user's conversations
 */
router.get(
  '/conversations',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await directMessageService.getConversations(req.user!.userId, {
        page,
        limit,
      });

      res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/messages/conversation/:partnerId
 * Get messages in a conversation
 */
router.get(
  '/conversation/:partnerId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const partnerId = req.params.partnerId as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await directMessageService.getConversationMessages(
        req.user!.userId,
        partnerId,
        { page, limit }
      );

      res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * POST /api/messages
 * Send a direct message
 */
router.post(
  '/',
  authenticate,
  messageLimiter,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { recipientId, content, parentMessageId } = req.body;

      const message = await directMessageService.sendMessage(
        req.user!.userId,
        recipientId,
        content,
        parentMessageId
      );

      res.status(201).json({ message });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * PUT /api/messages/:id/read
 * Mark a message as read
 */
router.put(
  '/:id/read',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const id = req.params.id as string;

      await directMessageService.markAsRead(id, req.user!.userId);

      res.status(200).json({ message: 'Message marked as read' });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * PUT /api/messages/conversation/:partnerId/read
 * Mark all messages from a user as read
 */
router.put(
  '/conversation/:partnerId/read',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const partnerId = req.params.partnerId as string;

      await directMessageService.markConversationAsRead(
        req.user!.userId,
        partnerId
      );

      res.status(200).json({ message: 'Conversation marked as read' });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * DELETE /api/messages/:id
 * Delete a message
 */
router.delete(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const id = req.params.id as string;

      await directMessageService.deleteMessage(id, req.user!.userId);

      res.status(200).json({ message: 'Message deleted successfully' });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/messages/unread-count
 * Get unread message count
 */
router.get(
  '/unread-count',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const count = await directMessageService.getUnreadCount(req.user!.userId);

      res.status(200).json({ count });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/messages/search
 * Search messages
 */
router.get(
  '/search',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const query = req.query.q as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!query || query.length < 2) {
        return res.status(400).json({ error: 'Query must be at least 2 characters' });
      }

      const result = await directMessageService.searchMessages(
        req.user!.userId,
        query,
        { page, limit }
      );

      res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
