import { Router, Request, Response, NextFunction } from 'express';
import modLogService from '../services/modLogService';
import { authenticate, requireSuperuser } from '../middleware/auth';
import { generalLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * GET /api/modlog/topic/:topicId
 * Get moderation logs for a topic (public)
 */
router.get(
  '/topic/:topicId',
  generalLimiter,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { topicId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const filters: any = {};
      if (req.query.moderatorId) filters.moderatorId = req.query.moderatorId as string;
      if (req.query.action) filters.action = req.query.action as any;
      if (req.query.targetUserId) filters.targetUserId = req.query.targetUserId as string;
      if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
      if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);

      const result = await modLogService.getTopicLogs(
        topicId,
        { page, limit },
        filters
      );

      res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/modlog
 * Get all moderation logs (admin only)
 */
router.get(
  '/',
  authenticate,
  requireSuperuser,
  generalLimiter,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const filters: any = {};
      if (req.query.topicId) filters.topicId = req.query.topicId as string;
      if (req.query.moderatorId) filters.moderatorId = req.query.moderatorId as string;
      if (req.query.action) filters.action = req.query.action as any;
      if (req.query.targetUserId) filters.targetUserId = req.query.targetUserId as string;
      if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
      if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);

      const result = await modLogService.getAllLogs({ page, limit }, filters);

      res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/modlog/moderator/:moderatorId
 * Get logs by moderator
 */
router.get(
  '/moderator/:moderatorId',
  authenticate,
  generalLimiter,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { moderatorId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await modLogService.getModeratorLogs(moderatorId, {
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
 * GET /api/modlog/user/:userId
 * Get logs targeting a specific user
 */
router.get(
  '/user/:userId',
  authenticate,
  generalLimiter,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await modLogService.getTargetLogs(userId, {
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
 * GET /api/modlog/stats/topic/:topicId
 * Get moderation statistics for a topic
 */
router.get(
  '/stats/topic/:topicId',
  generalLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { topicId } = req.params;

      const stats = await modLogService.getTopicStats(topicId);

      res.status(200).json({ stats });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/modlog/stats/moderator/:moderatorId
 * Get moderation statistics for a moderator
 */
router.get(
  '/stats/moderator/:moderatorId',
  authenticate,
  generalLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { moderatorId } = req.params;

      const stats = await modLogService.getModeratorStats(moderatorId);

      res.status(200).json({ stats });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
