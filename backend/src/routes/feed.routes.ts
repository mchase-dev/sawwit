import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { posts, topicMembers, comments, votes } from '../db/schema';
import { eq, and, inArray, desc, count as drizzleCount } from 'drizzle-orm';
import { optionalAuth, authenticate } from '../middleware/auth';
import { generalLimiter } from '../middleware/rateLimiter';
import sortingService from '../services/sortingService';

const router = Router();

/**
 * GET /api/feed/home
 * Get home feed (posts from subscribed topics)
 */
router.get(
  '/home',
  authenticate,
  generalLimiter,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const sort = (req.query.sort as any) || 'hot';
      const skip = (page - 1) * limit;

      // Get user's subscribed topics
      const memberships = await db.query.topicMembers.findMany({
        where: eq(topicMembers.userId, req.user!.userId),
        columns: { topicId: true },
      });

      const topicIds = memberships.map((m) => m.topicId);

      if (topicIds.length === 0) {
        return res.status(200).json({
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
          },
        });
      }

      // Get posts from subscribed topics
      const postList = await db.query.posts.findMany({
        where: and(
          inArray(posts.topicId, topicIds),
          eq(posts.isDeleted, false)
        ),
        with: {
          author: {
            columns: {
              id: true,
              username: true,
              avatarStyle: true,
              avatarSeed: true,
            },
          },
          topic: {
            columns: {
              name: true,
              displayName: true,
            },
          },
          tag: true,
        },
        orderBy: desc(posts.createdAt),
        limit: limit * 2, // Get more for sorting
      });

      // Get total count
      const [totalResult] = await db.select({ count: drizzleCount() })
        .from(posts)
        .where(and(
          inArray(posts.topicId, topicIds),
          eq(posts.isDeleted, false)
        ));
      const total = totalResult.count;

      // Add counts to posts
      const postsWithCounts = await Promise.all(
        postList.map(async (post) => {
          const [commentCountResult] = await db.select({ count: drizzleCount() })
            .from(comments)
            .where(eq(comments.postId, post.id));
          const [voteCountResult] = await db.select({ count: drizzleCount() })
            .from(votes)
            .where(eq(votes.postId, post.id));

          return {
            ...post,
            _count: {
              comments: commentCountResult.count,
              votes: voteCountResult.count,
            },
          };
        })
      );

      // Apply sorting
      let sortedPosts = postsWithCounts;
      if (sort === 'hot') {
        sortedPosts = await sortingService.sortPostsByHot(postsWithCounts);
      } else if (sort === 'top') {
        sortedPosts = await sortingService.sortPostsByTop(postsWithCounts);
      } else if (sort === 'rising') {
        sortedPosts = await sortingService.sortPostsByRising(postsWithCounts);
      } else if (sort === 'controversial') {
        sortedPosts = await sortingService.sortPostsByControversial(postsWithCounts);
      }

      // Paginate
      const paginatedPosts = sortedPosts.slice(skip, skip + limit);

      res.status(200).json({
        data: paginatedPosts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1,
        },
      });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/feed/all
 * Get all feed (posts from all topics)
 */
router.get(
  '/all',
  optionalAuth,
  generalLimiter,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const sort = (req.query.sort as any) || 'hot';
      const nsfw = req.query.nsfw === 'true';
      const skip = (page - 1) * limit;

      // Build where clause
      const whereConditions = [eq(posts.isDeleted, false)];
      if (!nsfw) {
        whereConditions.push(eq(posts.isNSFW, false));
      }
      const whereClause = whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0];

      // Get all posts
      const postList = await db.query.posts.findMany({
        where: whereClause,
        with: {
          author: {
            columns: {
              id: true,
              username: true,
              avatarStyle: true,
              avatarSeed: true,
            },
          },
          topic: {
            columns: {
              name: true,
              displayName: true,
            },
          },
          tag: true,
        },
        orderBy: desc(posts.createdAt),
        limit: limit * 2, // Get more for sorting
      });

      // Get total count
      const [totalResult] = await db.select({ count: drizzleCount() })
        .from(posts)
        .where(whereClause);
      const total = totalResult.count;

      // Add counts to posts
      const postsWithCounts = await Promise.all(
        postList.map(async (post) => {
          const [commentCountResult] = await db.select({ count: drizzleCount() })
            .from(comments)
            .where(eq(comments.postId, post.id));
          const [voteCountResult] = await db.select({ count: drizzleCount() })
            .from(votes)
            .where(eq(votes.postId, post.id));

          return {
            ...post,
            _count: {
              comments: commentCountResult.count,
              votes: voteCountResult.count,
            },
          };
        })
      );

      // Apply sorting
      let sortedPosts = postsWithCounts;
      if (sort === 'hot') {
        sortedPosts = await sortingService.sortPostsByHot(postsWithCounts);
      } else if (sort === 'top') {
        sortedPosts = await sortingService.sortPostsByTop(postsWithCounts);
      } else if (sort === 'rising') {
        sortedPosts = await sortingService.sortPostsByRising(postsWithCounts);
      } else if (sort === 'controversial') {
        sortedPosts = await sortingService.sortPostsByControversial(postsWithCounts);
      }

      // Paginate
      const paginatedPosts = sortedPosts.slice(skip, skip + limit);

      res.status(200).json({
        data: paginatedPosts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1,
        },
      });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
