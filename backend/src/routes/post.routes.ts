import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { posts, topicMembers } from '../db/schema';
import { eq, and, or } from 'drizzle-orm';

// Helper to check if a string is a valid UUID
const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

// Helper to get post by ID or slug
const getPostByIdOrSlug = async (identifier: string) => {
  const whereClause = isUuid(identifier)
    ? or(eq(posts.id, identifier), eq(posts.slug, identifier))
    : eq(posts.slug, identifier);
  return db.query.posts.findFirst({ where: whereClause });
};
import postService from '../services/postService';
import commentService from '../services/commentService';
import savedPostService from '../services/savedPostService';
import { authenticate, optionalAuth } from '../middleware/auth';
import { generalLimiter, createCommentLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * GET /api/posts/:identifier
 * Get post by ID or slug
 */
router.get(
  '/:identifier',
  optionalAuth,
  generalLimiter,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { identifier } = req.params;
      const userId = req.user?.userId;

      const post = await postService.getPost(identifier, userId);

      res.status(200).json({ post });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * PUT /api/posts/:id
 * Update a post
 */
router.put(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { id } = req.params;
      const { title, content, isNSFW, isSpoiler, tagId } = req.body;

      // Check if user is moderator (support both ID and slug)
      const post = await getPostByIdOrSlug(id);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      const membership = await db.query.topicMembers.findFirst({
        where: and(
          eq(topicMembers.topicId, post.topicId),
          eq(topicMembers.userId, req.user!.userId)
        ),
      });

      const isMod = membership?.role === 'MODERATOR' || post.authorId === req.user!.userId;

      const updatedPost = await postService.updatePost(
        post.id,
        req.user!.userId,
        { title, content, isNSFW, isSpoiler, tagId },
        isMod
      );

      res.status(200).json({ post: updatedPost });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * DELETE /api/posts/:id
 * Delete a post
 */
router.delete(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { id } = req.params;

      // Check if user is moderator (support both ID and slug)
      const post = await getPostByIdOrSlug(id);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      const membership = await db.query.topicMembers.findFirst({
        where: and(
          eq(topicMembers.topicId, post.topicId),
          eq(topicMembers.userId, req.user!.userId)
        ),
      });

      const isMod = membership?.role === 'MODERATOR' || post.authorId === req.user!.userId;

      await postService.deletePost(post.id, req.user!.userId, isMod);

      res.status(200).json({ message: 'Post deleted successfully' });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/posts/:id/comments
 * Get comments for a post
 */
router.get(
  '/:id/comments',
  optionalAuth,
  generalLimiter,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { id } = req.params;
      const sort = (req.query.sort as any) || 'best';
      const userId = req.user?.userId;

      const comments = await commentService.getPostComments(id, sort, userId);

      res.status(200).json({ comments });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * POST /api/posts/:id/comments
 * Create a comment on a post
 */
router.post(
  '/:id/comments',
  authenticate,
  createCommentLimiter,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { id } = req.params;
      const { content, parentId } = req.body;

      const comment = await commentService.createComment(
        req.user!.userId,
        id,
        content,
        parentId
      );

      res.status(201).json({ comment });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * POST /api/posts/:id/save
 * Save a post
 */
router.post(
  '/:id/save',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { id } = req.params;

      await savedPostService.savePost(req.user!.userId, id);

      res.status(200).json({ message: 'Post saved successfully' });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * DELETE /api/posts/:id/save
 * Unsave a post
 */
router.delete(
  '/:id/save',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { id } = req.params;

      await savedPostService.unsavePost(req.user!.userId, id);

      res.status(200).json({ message: 'Post unsaved successfully' });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * POST /api/posts/:id/pin
 * Pin a post (moderator only)
 */
router.post(
  '/:id/pin',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { id } = req.params;

      await postService.pinPost(id);

      res.status(200).json({ message: 'Post pinned successfully' });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * DELETE /api/posts/:id/pin
 * Unpin a post (moderator only)
 */
router.delete(
  '/:id/pin',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { id } = req.params;

      await postService.unpinPost(id);

      res.status(200).json({ message: 'Post unpinned successfully' });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * POST /api/posts/:id/lock
 * Lock a post (moderator only)
 */
router.post(
  '/:id/lock',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { id } = req.params;

      await postService.lockPost(id);

      res.status(200).json({ message: 'Post locked successfully' });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * DELETE /api/posts/:id/lock
 * Unlock a post (moderator only)
 */
router.delete(
  '/:id/lock',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { id } = req.params;

      await postService.unlockPost(id);

      res.status(200).json({ message: 'Post unlocked successfully' });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
