import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { topics, posts, users, topicMembers, comments, votes } from '../db/schema';
import { eq, and, or, ilike, count as drizzleCount } from 'drizzle-orm';
import { generalLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * GET /api/search
 * Global search for topics, posts, and users
 */
router.get(
  '/',
  generalLimiter,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const query = req.query.q as string;
      const type = req.query.type as 'topics' | 'posts' | 'users' | 'all';
      const limit = parseInt(req.query.limit as string) || 10;

      if (!query || query.length < 2) {
        return res.status(400).json({ error: 'Query must be at least 2 characters' });
      }

      const results: any = {};

      // Search topics
      if (!type || type === 'all' || type === 'topics') {
        const topicList = await db.query.topics.findMany({
          where: or(
            ilike(topics.name, `%${query}%`),
            ilike(topics.displayName, `%${query}%`),
            ilike(topics.description, `%${query}%`)
          ),
          limit,
        });

        // Add counts for each topic
        results.topics = await Promise.all(
          topicList.map(async (topic) => {
            const [memberCountResult] = await db.select({ count: drizzleCount() })
              .from(topicMembers)
              .where(eq(topicMembers.topicId, topic.id));
            const [postCountResult] = await db.select({ count: drizzleCount() })
              .from(posts)
              .where(eq(posts.topicId, topic.id));

            return {
              ...topic,
              _count: {
                members: memberCountResult.count,
                posts: postCountResult.count,
              },
            };
          })
        );
      }

      // Search posts
      if (!type || type === 'all' || type === 'posts') {
        const postList = await db.query.posts.findMany({
          where: and(
            or(
              ilike(posts.title, `%${query}%`),
              ilike(posts.content, `%${query}%`)
            ),
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
          },
          limit,
        });

        // Add counts for each post
        results.posts = await Promise.all(
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
      }

      // Search users
      if (!type || type === 'all' || type === 'users') {
        results.users = await db.query.users.findMany({
          where: or(
            ilike(users.username, `%${query}%`),
            ilike(users.displayName, `%${query}%`)
          ),
          columns: {
            id: true,
            username: true,
            displayName: true,
            avatarStyle: true,
            avatarSeed: true,
            postCred: true,
            commentCred: true,
          },
          limit,
        });
      }

      res.status(200).json(results);
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/search/topics/:topicName
 * Topic-specific search for posts
 */
router.get(
  '/topics/:topicName',
  generalLimiter,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { topicName } = req.params;
      const query = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!query || query.length < 2) {
        return res.status(400).json({ error: 'Query must be at least 2 characters' });
      }

      // Get topic
      const topic = await db.query.topics.findFirst({
        where: eq(topics.name, topicName),
      });

      if (!topic) {
        return res.status(404).json({ error: 'Topic not found' });
      }

      // Search posts in topic
      const postList = await db.query.posts.findMany({
        where: and(
          eq(posts.topicId, topic.id),
          or(
            ilike(posts.title, `%${query}%`),
            ilike(posts.content, `%${query}%`)
          ),
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
        },
        limit,
      });

      // Add counts for each post
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

      res.status(200).json({ posts: postsWithCounts });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
