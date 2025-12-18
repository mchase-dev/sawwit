import { db } from '../db';
import { posts, savedPosts, votes, comments } from '../db/schema';
import { eq, and, or, desc, count as drizzleCount } from 'drizzle-orm';
import { AppError } from '../middleware/errorHandler';
import { PaginationParams } from '../types';

// Helper to check if a string is a valid UUID
const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

class SavedPostService {
  /**
   * Save a post
   */
  async savePost(userId: string, postIdentifier: string): Promise<void> {
    // Verify post exists (support both ID and slug)
    const postWhere = isUuid(postIdentifier)
      ? or(eq(posts.id, postIdentifier), eq(posts.slug, postIdentifier))
      : eq(posts.slug, postIdentifier);

    const post = await db.query.posts.findFirst({
      where: postWhere,
    });

    if (!post || post.isDeleted) {
      throw new AppError(404, 'Post not found');
    }

    // Check if already saved
    const existingSave = await db.query.savedPosts.findFirst({
      where: and(
        eq(savedPosts.userId, userId),
        eq(savedPosts.postId, post.id)
      ),
    });

    if (existingSave) {
      throw new AppError(400, 'Post is already saved');
    }

    // Save post
    await db.insert(savedPosts).values({
      userId,
      postId: post.id,
    });
  }

  /**
   * Unsave a post
   */
  async unsavePost(userId: string, postIdentifier: string): Promise<void> {
    // Look up post by ID or slug
    const postWhere = isUuid(postIdentifier)
      ? or(eq(posts.id, postIdentifier), eq(posts.slug, postIdentifier))
      : eq(posts.slug, postIdentifier);

    const post = await db.query.posts.findFirst({
      where: postWhere,
      columns: { id: true },
    });

    if (!post) {
      throw new AppError(404, 'Post not found');
    }

    // Check if post is saved
    const savedPost = await db.query.savedPosts.findFirst({
      where: and(
        eq(savedPosts.userId, userId),
        eq(savedPosts.postId, post.id)
      ),
    });

    if (!savedPost) {
      throw new AppError(400, 'Post is not saved');
    }

    // Remove save
    await db.delete(savedPosts)
      .where(and(
        eq(savedPosts.userId, userId),
        eq(savedPosts.postId, post.id)
      ));
  }

  /**
   * Check if a post is saved by user
   */
  async isPostSaved(userId: string, postId: string): Promise<boolean> {
    const savedPost = await db.query.savedPosts.findFirst({
      where: and(
        eq(savedPosts.userId, userId),
        eq(savedPosts.postId, postId)
      ),
    });

    return !!savedPost;
  }

  /**
   * Get user's saved posts
   */
  async getSavedPosts(
    userId: string,
    { page = 1, limit = 20 }: PaginationParams
  ): Promise<any> {
    const offset = (page - 1) * limit;

    const [savedPostList, totalResult] = await Promise.all([
      db.query.savedPosts.findMany({
        where: eq(savedPosts.userId, userId),
        with: {
          post: {
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
                  id: true,
                  name: true,
                  displayName: true,
                },
              },
              tag: true,
            },
          },
        },
        orderBy: desc(savedPosts.savedAt),
        offset,
        limit,
      }),
      db.select({ count: drizzleCount() })
        .from(savedPosts)
        .where(eq(savedPosts.userId, userId)),
    ]);

    const total = totalResult[0].count;

    // Get vote counts for each post
    const postsWithVotes = await Promise.all(
      savedPostList.map(async (savedPost) => {
        const voteList = await db.query.votes.findMany({
          where: eq(votes.postId, savedPost.post.id),
        });

        const voteCount = voteList.reduce((sum, vote) => sum + vote.value, 0);
        const userVote = voteList.find((v) => v.userId === userId)?.value || 0;

        // Count comments
        const commentList = await db.query.comments.findMany({
          where: eq(comments.postId, savedPost.post.id),
        });

        return {
          ...savedPost.post,
          savedAt: savedPost.savedAt,
          voteCount,
          userVote,
          commentCount: commentList.length,
          _count: {
            comments: commentList.length,
            votes: voteList.length,
          },
        };
      })
    );

    return {
      data: postsWithVotes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Get user's saved posts count
   */
  async getSavedPostsCount(userId: string): Promise<number> {
    const result = await db.select({ count: drizzleCount() })
      .from(savedPosts)
      .where(eq(savedPosts.userId, userId));
    return result[0].count;
  }

  /**
   * Clear all saved posts for a user
   */
  async clearAllSavedPosts(userId: string): Promise<void> {
    await db.delete(savedPosts)
      .where(eq(savedPosts.userId, userId));
  }

  /**
   * Get users who saved a specific post (for analytics)
   */
  async getPostSavers(
    postId: string,
    { page = 1, limit = 20 }: PaginationParams
  ): Promise<any> {
    const offset = (page - 1) * limit;

    const [saves, totalResult] = await Promise.all([
      db.query.savedPosts.findMany({
        where: eq(savedPosts.postId, postId),
        with: {
          user: {
            columns: {
              id: true,
              username: true,
              avatarStyle: true,
              avatarSeed: true,
            },
          },
        },
        orderBy: desc(savedPosts.savedAt),
        offset,
        limit,
      }),
      db.select({ count: drizzleCount() })
        .from(savedPosts)
        .where(eq(savedPosts.postId, postId)),
    ]);

    const total = totalResult[0].count;

    return {
      data: saves.map((save) => ({
        user: save.user,
        savedAt: save.savedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }
}

export default new SavedPostService();
