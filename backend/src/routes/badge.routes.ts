import { Router, Request, Response, NextFunction } from 'express';
import badgeService from '../services/badgeService';
import { authenticate } from '../middleware/auth';
import { generalLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * GET /api/badges/user/:userId
 * Get all badges for a user across all topics
 */
router.get(
  '/user/:userId',
  generalLimiter,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { userId } = req.params;

      const badges = await badgeService.getUserBadges(userId);

      return res.status(200).json({ badges });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/badges/user/:userId/topic/:topicId
 * Get badge for user in specific topic
 */
router.get(
  '/user/:userId/topic/:topicId',
  generalLimiter,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { userId, topicId } = req.params;

      const badge = await badgeService.getUserBadgeInTopic(userId, topicId);

      return res.status(200).json({ badge });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/badges/topic/:topicId
 * Get all badges in a topic
 */
router.get(
  '/topic/:topicId',
  generalLimiter,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { topicId } = req.params;

      const badges = await badgeService.getTopicBadges(topicId);

      return res.status(200).json({ badges });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * POST /api/badges
 * Award a badge to a user in a topic (moderator only)
 */
router.post(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { topicId, userId, text, textColor, bgColor } = req.body;

      const badge = await badgeService.awardBadge(
        topicId,
        userId,
        text,
        req.user!.userId,
        textColor,
        bgColor
      );

      return res.status(201).json({ badge });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * DELETE /api/badges/topic/:topicId/user/:userId
 * Remove a badge from a user in a topic (moderator only)
 */
router.delete(
  '/topic/:topicId/user/:userId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { topicId, userId } = req.params;

      await badgeService.removeBadge(topicId, userId);

      return res.status(200).json({ message: 'Badge removed successfully' });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
