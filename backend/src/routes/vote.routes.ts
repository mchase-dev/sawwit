import { Router, Request, Response, NextFunction } from 'express';
import voteService from '../services/voteService';
import { authenticate } from '../middleware/auth';
import { voteLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * POST /api/votes/upvote
 * Upvote a post or comment
 */
router.post(
  '/upvote',
  authenticate,
  voteLimiter,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { postId, commentId } = req.body;

      await voteService.upvote(req.user!.userId, postId, commentId);

      res.status(200).json({ message: 'Upvote recorded successfully' });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * POST /api/votes/downvote
 * Downvote a post or comment
 */
router.post(
  '/downvote',
  authenticate,
  voteLimiter,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { postId, commentId } = req.body;

      await voteService.downvote(req.user!.userId, postId, commentId);

      res.status(200).json({ message: 'Downvote recorded successfully' });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * DELETE /api/votes
 * Remove vote from a post or comment
 */
router.delete(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { postId, commentId } = req.body;

      await voteService.removeVote(req.user!.userId, postId, commentId);

      res.status(200).json({ message: 'Vote removed successfully' });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/votes
 * Get user's vote on a post or comment
 */
router.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const postId = req.query.postId as string;
      const commentId = req.query.commentId as string;

      const vote = await voteService.getUserVote(
        req.user!.userId,
        postId,
        commentId
      );

      res.status(200).json({ vote });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
