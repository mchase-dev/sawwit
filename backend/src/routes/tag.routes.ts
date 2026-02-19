import { Router, Request, Response, NextFunction } from 'express';
import tagService from '../services/tagService';
import { authenticate } from '../middleware/auth';
import { generalLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * GET /api/tags/topic/:topicId
 * Get all tags for a topic
 */
router.get(
  '/topic/:topicId',
  generalLimiter,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const topicId = req.params.topicId as string;

      const tags = await tagService.getTopicTags(topicId);

      res.status(200).json({ tags });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * POST /api/tags
 * Create a tag (moderator only)
 */
router.post(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { topicId, name, color, description } = req.body;

      const tag = await tagService.createTag(req.user!.userId, topicId, {
        name,
        color,
        description,
      });

      res.status(201).json({ tag });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/tags/:id
 * Get tag by ID
 */
router.get(
  '/:id',
  generalLimiter,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const id = req.params.id as string;

      const tag = await tagService.getTagById(id);

      res.status(200).json({ tag });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * PUT /api/tags/:id
 * Update a tag (moderator only)
 */
router.put(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const id = req.params.id as string;
      const { name, color, description } = req.body;

      const tag = await tagService.updateTag(req.user!.userId, id, {
        name,
        color,
        description,
      });

      res.status(200).json({ tag });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * DELETE /api/tags/:id
 * Delete a tag (moderator only)
 */
router.delete(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const id = req.params.id as string;

      await tagService.deleteTag(id, req.user!.userId);

      res.status(200).json({ message: 'Tag deleted successfully' });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/tags/:id/posts
 * Get posts with a specific tag
 */
router.get(
  '/:id/posts',
  generalLimiter,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const id = req.params.id as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await tagService.getPostsByTag(id, page, limit);

      res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
