import { Router, Request, Response, NextFunction } from 'express';
import savedPostService from '../services/savedPostService';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * POST /api/saved/:postId
 * Save a post
 */
router.post(
  '/:postId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { postId } = req.params;

      await savedPostService.savePost(req.user!.userId, postId);

      res.status(200).json({ message: 'Post saved successfully' });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * DELETE /api/saved/:postId
 * Unsave a post
 */
router.delete(
  '/:postId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { postId } = req.params;

      await savedPostService.unsavePost(req.user!.userId, postId);

      res.status(200).json({ message: 'Post unsaved successfully' });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/saved/check/:postId
 * Check if post is saved
 */
router.get(
  '/check/:postId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { postId } = req.params;

      const isSaved = await savedPostService.isPostSaved(req.user!.userId, postId);

      res.status(200).json({ isSaved });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
