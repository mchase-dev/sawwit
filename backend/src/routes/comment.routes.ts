import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { comments, topicMembers } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import commentService from '../services/commentService';
import { authenticate } from '../middleware/auth';
import { generalLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * GET /api/comments/:id
 * Get comment by ID
 */
router.get(
  '/:id',
  generalLimiter,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      const comment = await commentService.getCommentById(id, userId);

      res.status(200).json({ comment });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * PUT /api/comments/:id
 * Update a comment
 */
router.put(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { id } = req.params;
      const { content } = req.body;

      // Check if user is moderator
      const comment = await db.query.comments.findFirst({
        where: eq(comments.id, id),
        with: { post: true },
      });

      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      const membership = await db.query.topicMembers.findFirst({
        where: and(
          eq(topicMembers.topicId, comment.post.topicId),
          eq(topicMembers.userId, req.user!.userId)
        ),
      });

      const isMod =
        membership?.role === 'MODERATOR' || comment.authorId === req.user!.userId;

      const updatedComment = await commentService.updateComment(
        id,
        req.user!.userId,
        content,
        isMod
      );

      res.status(200).json({ comment: updatedComment });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * DELETE /api/comments/:id
 * Delete a comment
 */
router.delete(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { id } = req.params;

      // Check if user is moderator
      const comment = await db.query.comments.findFirst({
        where: eq(comments.id, id),
        with: { post: true },
      });

      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      const membership = await db.query.topicMembers.findFirst({
        where: and(
          eq(topicMembers.topicId, comment.post.topicId),
          eq(topicMembers.userId, req.user!.userId)
        ),
      });

      const isMod =
        membership?.role === 'MODERATOR' || comment.authorId === req.user!.userId;

      await commentService.deleteComment(id, req.user!.userId, isMod);

      res.status(200).json({ message: 'Comment deleted successfully' });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
