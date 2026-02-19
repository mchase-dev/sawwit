import { Router, Request, Response, NextFunction } from 'express';
import trendingService from '../services/trendingService';
import { generalLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * GET /api/trending/topics
 * Get trending topics
 */
router.get(
  '/topics',
  generalLimiter,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const forceRefresh = req.query.refresh === 'true';

      const topics = await trendingService.getTrendingTopics(limit, forceRefresh);

      res.status(200).json({ topics });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/trending/posts
 * Get trending posts across all topics
 */
router.get(
  '/posts',
  generalLimiter,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const forceRefresh = req.query.refresh === 'true';

      const posts = await trendingService.getTrendingPosts(limit, forceRefresh);

      res.status(200).json({ posts });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/trending/posts/topic/:topicId
 * Get trending posts for a specific topic
 */
router.get(
  '/posts/topic/:topicId',
  generalLimiter,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const topicId = req.params.topicId as string;
      const limit = parseInt(req.query.limit as string) || 20;

      const posts = await trendingService.getTrendingPostsForTopic(topicId, limit);

      res.status(200).json({ posts });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * POST /api/trending/cache/clear
 * Clear trending cache (admin only)
 */
router.post(
  '/cache/clear',
  async (_req: Request, res: Response, next: NextFunction)=> {
    try {
      trendingService.clearCache();

      res.status(200).json({ message: 'Cache cleared successfully' });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/trending/cache/status
 * Get cache status
 */
router.get(
  '/cache/status',
  async (_req: Request, res: Response, next: NextFunction)=> {
    try {
      const status = trendingService.getCacheStatus();

      res.status(200).json({ status });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
