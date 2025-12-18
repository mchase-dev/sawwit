import { db } from '../db';
import { posts, topics, topicMembers, votes, comments } from '../db/schema';
import { eq, and, or, desc, count as drizzleCount } from 'drizzle-orm';
import { generatePostSlug } from '../utils/slugify';
import { sanitizePostContent, sanitizeUrl } from '../utils/sanitize';
import { AppError } from '../middleware/errorHandler';
import { PaginationParams, PostSortOption } from '../types';
import modLogService from './modLogService';
import mentionService from './mentionService';
import { hotScore, controversyScore, risingScore, sortByScore } from '../utils/sorting';

// Import enum types from schema
type PostType = 'TEXT' | 'LINK' | 'IMAGE';

class PostService {
  /**
   * Create a new post
   */
  async createPost(
    userId: string,
    topicId: string,
    data: {
      title: string;
      content: string;
      type?: PostType;
      linkUrl?: string;
      imageUrl?: string;
      isNSFW?: boolean;
      isSpoiler?: boolean;
      tagId?: string;
    }
  ): Promise<any> {
    // Verify user is a member of the topic
    const membership = await db.query.topicMembers.findFirst({
      where: and(
        eq(topicMembers.topicId, topicId),
        eq(topicMembers.userId, userId)
      ),
    });

    if (!membership) {
      throw new AppError(403, 'You must be a member of this topic to post');
    }

    if (membership.isBanned) {
      throw new AppError(403, 'You are banned from this topic');
    }

    // Validate and sanitize content
    const type = data.type || 'TEXT';
    let sanitizedContent = sanitizePostContent(data.content);

    // Validate link URL if link post
    let linkUrl = null;
    if (type === 'LINK' && data.linkUrl) {
      linkUrl = sanitizeUrl(data.linkUrl);
      if (!linkUrl) {
        throw new AppError(400, 'Invalid link URL');
      }
    }

    // Generate slug
    const slug = generatePostSlug(data.title);

    // Create post
    const [createdPost] = await db.insert(posts).values({
      slug,
      title: data.title,
      content: sanitizedContent,
      type,
      linkUrl,
      imageUrl: data.imageUrl || null,
      isNSFW: data.isNSFW || false,
      isSpoiler: data.isSpoiler || false,
      topicId,
      authorId: userId,
      tagId: data.tagId || null,
    }).returning();

    // Fetch with relations
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, createdPost.id),
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
    });

    // Update topic last activity
    await db.update(topics)
      .set({ lastActivityAt: new Date() })
      .where(eq(topics.id, topicId));

    // Process @mentions in content and send notifications
    if (sanitizedContent) {
      await mentionService.processMentionsInPost(
        createdPost.id,
        sanitizedContent,
        userId
      );
    }

    return post;
  }

  /**
   * Get post by ID or slug
   */
  async getPost(identifier: string, userId?: string): Promise<any> {
    // Check if identifier is a valid UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

    // Build where clause based on identifier type
    const whereClause = isUuid
      ? and(or(eq(posts.id, identifier), eq(posts.slug, identifier)), eq(posts.isDeleted, false))
      : and(eq(posts.slug, identifier), eq(posts.isDeleted, false));

    const post = await db.query.posts.findFirst({
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
            id: true,
            name: true,
            displayName: true,
          },
        },
        tag: true,
      },
    });

    if (!post) {
      throw new AppError(404, 'Post not found');
    }

    // Get vote counts and user's vote
    const voteList = await db.query.votes.findMany({
      where: eq(votes.postId, post.id),
    });

    const voteCount = voteList.reduce((sum, vote) => sum + vote.value, 0);
    const userVote = userId
      ? voteList.find((v) => v.userId === userId)?.value || 0
      : 0;

    // Count comments
    const commentList = await db.query.comments.findMany({
      where: eq(comments.postId, post.id),
    });

    return {
      ...post,
      voteCount,
      userVote,
      commentCount: commentList.length,
      _count: {
        comments: commentList.length,
        votes: voteList.length,
      },
    };
  }

  /**
   * Get posts for a topic
   */
  async getTopicPosts(
    topicId: string,
    { page = 1, limit = 20 }: PaginationParams,
    sort: PostSortOption = 'hot',
    userId?: string
  ): Promise<any> {
    const offset = (page - 1) * limit;

    // Get posts with basic sorting (Hot, Top, Rising, Controversial will be calculated)
    let orderBy: any = desc(posts.createdAt);
    if (sort === 'new') {
      orderBy = desc(posts.createdAt);
    }

    const [postList, totalResult] = await Promise.all([
      db.query.posts.findMany({
        where: and(
          eq(posts.topicId, topicId),
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
        orderBy,
        offset,
        limit,
      }),
      db.select({ count: drizzleCount() })
        .from(posts)
        .where(and(
          eq(posts.topicId, topicId),
          eq(posts.isDeleted, false)
        )),
    ]);

    const total = totalResult[0].count;

    // Add vote counts to each post
    const postsWithVotes = await Promise.all(
      postList.map(async (post) => {
        const voteList = await db.query.votes.findMany({
          where: eq(votes.postId, post.id),
        });

        const voteCount = voteList.reduce((sum, vote) => sum + vote.value, 0);
        const userVote = userId
          ? voteList.find((v) => v.userId === userId)?.value || 0
          : 0;

        // Count comments
        const commentList = await db.query.comments.findMany({
          where: eq(comments.postId, post.id),
        });

        return {
          ...post,
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

    // Apply sorting based on sort option
    const sortedPosts = this.sortPosts(postsWithVotes, sort);

    return {
      data: sortedPosts,
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
   * Sort posts based on sort option
   */
  private sortPosts(posts: any[], sort: PostSortOption): any[] {
    switch (sort) {
      case 'hot':
        // Time-decay algorithm - older posts need more votes to compete
        return sortByScore(posts, (p) => {
          const upvotes = Math.max(0, Math.round((p.voteCount + (p._count?.votes || 0)) / 2));
          const downvotes = Math.max(0, (p._count?.votes || 0) - upvotes);
          return hotScore(upvotes, downvotes, new Date(p.createdAt));
        });

      case 'top':
        // Simply by vote count
        return sortByScore(posts, (p) => p.voteCount);

      case 'new':
        // Newest first (already sorted by DB, but ensure consistency)
        return sortByScore(posts, (p) => new Date(p.createdAt).getTime());

      case 'rising':
        // Posts with high recent voting velocity
        return sortByScore(posts, (p) => {
          const upvotes = Math.max(0, Math.round((p.voteCount + (p._count?.votes || 0)) / 2));
          const downvotes = Math.max(0, (p._count?.votes || 0) - upvotes);
          return risingScore(upvotes, downvotes, new Date(p.createdAt));
        });

      case 'controversial':
        // High vote count but close to 50/50
        return sortByScore(posts, (p) => {
          const upvotes = Math.max(0, Math.round((p.voteCount + (p._count?.votes || 0)) / 2));
          const downvotes = Math.max(0, (p._count?.votes || 0) - upvotes);
          return controversyScore(upvotes, downvotes);
        });

      default:
        return posts;
    }
  }

  /**
   * Update a post
   */
  async updatePost(
    postId: string,
    userId: string,
    data: {
      title?: string;
      content?: string;
      isNSFW?: boolean;
      isSpoiler?: boolean;
      tagId?: string;
    },
    isModerator: boolean = false
  ): Promise<any> {
    // Get post
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
    });

    if (!post) {
      throw new AppError(404, 'Post not found');
    }

    // Check permissions
    if (post.authorId !== userId && !isModerator) {
      throw new AppError(403, 'You can only edit your own posts');
    }

    // Sanitize content if provided
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) {
      updateData.content = sanitizePostContent(data.content);
    }
    if (data.isNSFW !== undefined) updateData.isNSFW = data.isNSFW;
    if (data.isSpoiler !== undefined) updateData.isSpoiler = data.isSpoiler;
    if (data.tagId !== undefined) updateData.tagId = data.tagId;

    // Update post
    await db.update(posts)
      .set(updateData)
      .where(eq(posts.id, postId));

    // Fetch updated post with relations
    const updatedPost = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
      with: {
        author: {
          columns: {
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
    });

    return updatedPost;
  }

  /**
   * Delete a post (soft delete)
   */
  async deletePost(
    postId: string,
    userId: string,
    isModerator: boolean = false
  ): Promise<void> {
    // Get post
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
    });

    if (!post) {
      throw new AppError(404, 'Post not found');
    }

    // Check permissions
    if (post.authorId !== userId && !isModerator) {
      throw new AppError(403, 'You can only delete your own posts');
    }

    // Log moderator action if moderator is deleting someone else's post
    if (isModerator && post.authorId !== userId) {
      await modLogService.createLog({
        moderatorId: userId,
        topicId: post.topicId,
        action: 'DELETE_POST',
        targetType: 'POST',
        targetId: postId,
        reason: 'Post removed by moderator',
      });
    }

    // Soft delete
    await db.update(posts)
      .set({ isDeleted: true })
      .where(eq(posts.id, postId));
  }

  /**
   * Pin a post (moderator only)
   */
  async pinPost(postId: string): Promise<void> {
    await db.update(posts)
      .set({ isPinned: true })
      .where(eq(posts.id, postId));
  }

  /**
   * Unpin a post (moderator only)
   */
  async unpinPost(postId: string): Promise<void> {
    await db.update(posts)
      .set({ isPinned: false })
      .where(eq(posts.id, postId));
  }

  /**
   * Lock a post (moderator only)
   */
  async lockPost(postId: string): Promise<void> {
    await db.update(posts)
      .set({ isLocked: true })
      .where(eq(posts.id, postId));
  }

  /**
   * Unlock a post (moderator only)
   */
  async unlockPost(postId: string): Promise<void> {
    await db.update(posts)
      .set({ isLocked: false })
      .where(eq(posts.id, postId));
  }

  /**
   * Get vote score for a post
   */
  async getPostVoteScore(postId: string): Promise<number> {
    const voteList = await db.query.votes.findMany({
      where: eq(votes.postId, postId),
    });

    return voteList.reduce((sum, vote) => sum + vote.value, 0);
  }
}

export default new PostService();
