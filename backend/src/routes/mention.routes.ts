import { Router, Request, Response, NextFunction } from 'express';
import mentionService from '../services/mentionService';
import { authenticate } from '../middleware/auth';
import { generalLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * GET /api/mentions
 * Get user's mentions
 */
router.get(
  '/',
  authenticate,
  generalLimiter,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await mentionService.getUserMentions(
        req.user!.userId,
        page,
        limit
      );

      res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/mentions/post/:postId
 * Get mentions in a specific post
 */
router.get(
  '/post/:postId',
  generalLimiter,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { postId } = req.params;

      const mentions = await mentionService.getPostMentions(postId);

      res.status(200).json({ mentions });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/mentions/comment/:commentId
 * Get mentions in a specific comment
 */
router.get(
  '/comment/:commentId',
  generalLimiter,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { commentId } = req.params;

      const mentions = await mentionService.getCommentMentions(commentId);

      res.status(200).json({ mentions });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/mentions/count
 * Get mention count for user
 */
router.get(
  '/count',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const count = await mentionService.getMentionCount(req.user!.userId);

      res.status(200).json({ count });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/mentions/top-mentioners
 * Get users who mention current user most
 */
router.get(
  '/top-mentioners',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;

      const mentioners = await mentionService.getTopMentioners(
        req.user!.userId,
        limit
      );

      res.status(200).json({ mentioners });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/mentions/top-mentioned
 * Get users current user mentions most
 */
router.get(
  '/top-mentioned',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;

      const mentioned = await mentionService.getTopMentioned(req.user!.userId, limit);

      res.status(200).json({ mentioned });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
