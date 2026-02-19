import { Router, Request, Response, NextFunction } from 'express';
import topicService from '../services/topicService';
import postService from '../services/postService';
import { authenticate, optionalAuthenticate } from '../middleware/auth';
import { isModerator, isOwner } from '../middleware/permissions';
import { generalLimiter, createPostLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * GET /api/topics
 * Get all topics with pagination and sorting
 */
router.get(
  '/',
  optionalAuthenticate,
  generalLimiter,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const sort = (req.query.sort as 'popular' | 'new' | 'active') || 'popular';
      const userId = req.user?.userId;

      const result = await topicService.getAllTopics({ page, limit }, sort, userId);

      res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * POST /api/topics
 * Create a new topic
 */
router.post(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { displayName, description, rules } = req.body;

      if (!displayName || typeof displayName !== 'string' || !displayName.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Topic name is required',
        });
      }

      const topic = await topicService.createTopic(
        req.user!.userId,
        displayName,
        description,
        rules
      );

      res.status(201).json({ topic });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/topics/:name
 * Get topic by name
 */
router.get(
  '/:name',
  optionalAuthenticate,
  generalLimiter,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const name = req.params.name as string;
      const userId = req.user?.userId;

      const topic = await topicService.getTopic(name, userId);

      res.status(200).json({ topic });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * PUT /api/topics/:name
 * Update topic (owner only)
 */
router.put(
  '/:name',
  authenticate,
  isOwner,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { displayName, description, rules } = req.body;

      const topic = await topicService.updateTopic(
        req.topic!.id,
        req.user!.userId,
        { displayName, description, rules }
      );

      res.status(200).json({ topic });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * DELETE /api/topics/:name
 * Delete topic (owner only)
 */
router.delete(
  '/:name',
  authenticate,
  isOwner,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      await topicService.deleteTopic(req.topic!.id, req.user!.userId);

      res.status(200).json({ message: 'Topic deleted successfully' });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * POST /api/topics/:name/join
 * Join a topic
 */
router.post(
  '/:name/join',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const name = req.params.name as string;
      const topic = await topicService.getTopic(name);

      await topicService.joinTopic(topic.id, req.user!.userId);

      res.status(200).json({ message: 'Successfully joined topic' });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * POST /api/topics/:name/leave
 * Leave a topic
 */
router.post(
  '/:name/leave',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const name = req.params.name as string;
      const topic = await topicService.getTopic(name);

      await topicService.leaveTopic(topic.id, req.user!.userId);

      res.status(200).json({ message: 'Successfully left topic' });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/topics/:name/posts
 * Get posts in a topic
 */
router.get(
  '/:name/posts',
  optionalAuthenticate,
  generalLimiter,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const name = req.params.name as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const sort = (req.query.sort as any) || 'hot';
      const userId = req.user?.userId;

      const topic = await topicService.getTopic(name);

      const result = await postService.getTopicPosts(
        topic.id,
        { page, limit },
        sort,
        userId
      );

      res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * POST /api/topics/:name/posts
 * Create a post in a topic
 */
router.post(
  '/:name/posts',
  authenticate,
  createPostLimiter,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const name = req.params.name as string;
      const { title, content, type, linkUrl, imageUrl, isNSFW, isSpoiler, tagId } =
        req.body;

      const topic = await topicService.getTopic(name);

      // Normalize type to uppercase for enum compatibility
      const normalizedType = type ? (type.toUpperCase() as 'TEXT' | 'LINK' | 'IMAGE') : undefined;

      const post = await postService.createPost(req.user!.userId, topic.id, {
        title,
        content,
        type: normalizedType,
        linkUrl,
        imageUrl,
        isNSFW,
        isSpoiler,
        tagId,
      });

      res.status(201).json({ post });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * POST /api/topics/:name/moderators
 * Appoint a moderator (owner only)
 */
router.post(
  '/:name/moderators',
  authenticate,
  isOwner,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { userId } = req.body;

      await topicService.appointModerator(
        req.topic!.id,
        req.user!.userId,
        userId
      );

      res.status(200).json({ message: 'Moderator appointed successfully' });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * DELETE /api/topics/:name/moderators/:userId
 * Remove a moderator (owner only)
 */
router.delete(
  '/:name/moderators/:userId',
  authenticate,
  isOwner,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const userId = req.params.userId as string;

      await topicService.removeModerator(req.topic!.id, req.user!.userId, userId);

      res.status(200).json({ message: 'Moderator removed successfully' });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * POST /api/topics/:name/ban
 * Ban a user from a topic (moderator only)
 */
router.post(
  '/:name/ban',
  authenticate,
  isModerator,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { userId } = req.body;

      await topicService.banUser(req.topic!.id, req.user!.userId, userId);

      res.status(200).json({ message: 'User banned successfully' });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * POST /api/topics/:name/unban
 * Unban a user from a topic (moderator only)
 */
router.post(
  '/:name/unban',
  authenticate,
  isModerator,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { userId } = req.body;

      await topicService.unbanUser(req.topic!.id, req.user!.userId, userId);

      res.status(200).json({ message: 'User unbanned successfully' });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/topics/:name/banned
 * Get banned users in a topic (moderator only)
 */
router.get(
  '/:name/banned',
  authenticate,
  isModerator,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const bannedUsers = await topicService.getBannedUsers(req.topic!.id);

      res.status(200).json({ bannedUsers });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/topics/user/memberships
 * Get topics user is a member of
 */
router.get(
  '/user/memberships',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const topics = await topicService.getUserTopics(req.user!.userId);

      res.status(200).json({ topics });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/topics/user/moderated
 * Get topics user moderates
 */
router.get(
  '/user/moderated',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const topics = await topicService.getModeratedTopics(req.user!.userId);

      res.status(200).json({ topics });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
