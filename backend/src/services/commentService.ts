import { db } from '../db';
import { posts, topics, topicMembers, comments, votes } from '../db/schema';
import { eq, and, or, isNull, desc, asc } from 'drizzle-orm';

// Helper to check if a string is a valid UUID
const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
import { sanitizeCommentContent } from '../utils/sanitize';
import { AppError } from '../middleware/errorHandler';
import { CommentSortOption } from '../types';
import mentionService from './mentionService';
import { wilsonScore, controversyScore, sortByScore } from '../utils/sorting';

class CommentService {
  /**
   * Create a new comment
   */
  async createComment(
    userId: string,
    postIdentifier: string,
    content: string,
    parentId?: string
  ): Promise<any> {
    // Get post with topic info (support both ID and slug)
    const postWhere = isUuid(postIdentifier)
      ? or(eq(posts.id, postIdentifier), eq(posts.slug, postIdentifier))
      : eq(posts.slug, postIdentifier);

    const post = await db.query.posts.findFirst({
      where: postWhere,
      with: { topic: true },
    });

    if (!post) {
      throw new AppError(404, 'Post not found');
    }

    if (post.isDeleted) {
      throw new AppError(404, 'Post not found');
    }

    if (post.isLocked) {
      throw new AppError(403, 'This post is locked and cannot receive new comments');
    }

    // Verify user is a member of the topic
    const membership = await db.query.topicMembers.findFirst({
      where: and(
        eq(topicMembers.topicId, post.topicId),
        eq(topicMembers.userId, userId)
      ),
    });

    if (!membership) {
      throw new AppError(403, 'You must be a member of this topic to comment');
    }

    if (membership.isBanned) {
      throw new AppError(403, 'You are banned from this topic');
    }

    // If replying to a comment, verify parent exists
    if (parentId) {
      const parentComment = await db.query.comments.findFirst({
        where: eq(comments.id, parentId),
      });

      if (!parentComment || parentComment.postId !== post.id) {
        throw new AppError(400, 'Parent comment not found or does not belong to this post');
      }

      if (parentComment.isDeleted) {
        throw new AppError(400, 'Cannot reply to a deleted comment');
      }
    }

    // Sanitize content (plain text only)
    const sanitizedContent = sanitizeCommentContent(content);

    // Create comment
    const [createdComment] = await db.insert(comments).values({
      content: sanitizedContent,
      postId: post.id,
      authorId: userId,
      parentId: parentId || null,
    }).returning();

    // Fetch with author
    const comment = await db.query.comments.findFirst({
      where: eq(comments.id, createdComment.id),
      with: {
        author: {
          columns: {
            id: true,
            username: true,
            avatarStyle: true,
            avatarSeed: true,
          },
        },
      },
    });

    // Update topic last activity
    await db.update(topics)
      .set({ lastActivityAt: new Date() })
      .where(eq(topics.id, post.topicId));

    // Process @mentions in content and send notifications
    if (sanitizedContent) {
      await mentionService.processMentionsInComment(
        createdComment.id,
        post.id,
        sanitizedContent,
        userId
      );
    }

    return comment;
  }

  /**
   * Get comments for a post
   */
  async getPostComments(
    postIdentifier: string,
    sort: CommentSortOption = 'best',
    userId?: string
  ): Promise<any[]> {
    // First, look up the post by ID or slug to get the actual post ID
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

    // Get all top-level comments (no parent)
    const commentList = await db.query.comments.findMany({
      where: and(
        eq(comments.postId, post.id),
        isNull(comments.parentId),
        eq(comments.isDeleted, false)
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
      },
      orderBy: sort === 'new' ? desc(comments.createdAt) : asc(comments.createdAt),
    });

    // Add vote counts and fetch replies recursively
    const commentsWithData = await Promise.all(
      commentList.map(async (comment) => {
        const voteList = await db.query.votes.findMany({
          where: eq(votes.commentId, comment.id),
        });

        const voteCount = voteList.reduce((sum, vote) => sum + vote.value, 0);
        const userVote = userId
          ? voteList.find((v) => v.userId === userId)?.value || 0
          : 0;

        const children = await this.getCommentReplies(comment.id, userId);

        return {
          ...comment,
          voteCount,
          userVote,
          children,
          _count: {
            children: children.length,
            votes: voteList.length,
          },
        };
      })
    );

    // Apply sorting based on sort option
    const sortedComments = this.sortComments(commentsWithData, sort);

    return sortedComments;
  }

  /**
   * Get replies for a comment (recursive)
   */
  async getCommentReplies(commentId: string, userId?: string): Promise<any[]> {
    const replyList = await db.query.comments.findMany({
      where: and(
        eq(comments.parentId, commentId),
        eq(comments.isDeleted, false)
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
      },
      orderBy: asc(comments.createdAt),
    });

    // Add vote counts and fetch nested replies
    const repliesWithData = await Promise.all(
      replyList.map(async (reply) => {
        const voteList = await db.query.votes.findMany({
          where: eq(votes.commentId, reply.id),
        });

        const voteCount = voteList.reduce((sum, vote) => sum + vote.value, 0);
        const userVote = userId
          ? voteList.find((v) => v.userId === userId)?.value || 0
          : 0;

        const children = await this.getCommentReplies(reply.id, userId);

        return {
          ...reply,
          voteCount,
          userVote,
          children,
          _count: {
            children: children.length,
            votes: voteList.length,
          },
        };
      })
    );

    return repliesWithData;
  }

  /**
   * Sort comments based on sort option
   */
  private sortComments(comments: any[], sort: CommentSortOption): any[] {
    // Recursively sort children as well
    const sortChildren = (commentList: any[]): any[] => {
      return commentList.map(comment => ({
        ...comment,
        children: comment.children ? this.sortComments(comment.children, sort) : [],
      }));
    };

    let sorted: any[];

    switch (sort) {
      case 'best':
        // Wilson score - balances upvotes with sample size
        sorted = sortByScore(comments, (c) => {
          // Approximate upvotes/downvotes from voteCount
          const upvotes = Math.max(0, Math.round((c.voteCount + (c._count?.votes || 0)) / 2));
          const downvotes = Math.max(0, (c._count?.votes || 0) - upvotes);
          return wilsonScore(upvotes, downvotes);
        });
        break;

      case 'top':
        // Simply by vote count
        sorted = sortByScore(comments, (c) => c.voteCount);
        break;

      case 'new':
        // Newest first
        sorted = sortByScore(comments, (c) => new Date(c.createdAt).getTime());
        break;

      case 'old':
        // Oldest first
        sorted = sortByScore(comments, (c) => new Date(c.createdAt).getTime(), false);
        break;

      case 'controversial':
        // High vote count but close to 50/50
        sorted = sortByScore(comments, (c) => {
          const upvotes = Math.max(0, Math.round((c.voteCount + (c._count?.votes || 0)) / 2));
          const downvotes = Math.max(0, (c._count?.votes || 0) - upvotes);
          return controversyScore(upvotes, downvotes);
        });
        break;

      default:
        sorted = comments;
    }

    return sortChildren(sorted);
  }

  /**
   * Update a comment
   */
  async updateComment(
    commentId: string,
    userId: string,
    content: string,
    isModerator: boolean = false
  ): Promise<any> {
    // Get comment
    const comment = await db.query.comments.findFirst({
      where: eq(comments.id, commentId),
    });

    if (!comment) {
      throw new AppError(404, 'Comment not found');
    }

    // Check permissions
    if (comment.authorId !== userId && !isModerator) {
      throw new AppError(403, 'You can only edit your own comments');
    }

    // Sanitize content
    const sanitizedContent = sanitizeCommentContent(content);

    // Update comment
    await db.update(comments)
      .set({ content: sanitizedContent })
      .where(eq(comments.id, commentId));

    // Fetch updated comment with author
    const updatedComment = await db.query.comments.findFirst({
      where: eq(comments.id, commentId),
      with: {
        author: {
          columns: {
            username: true,
            avatarStyle: true,
            avatarSeed: true,
          },
        },
      },
    });

    return updatedComment;
  }

  /**
   * Delete a comment (soft delete)
   */
  async deleteComment(
    commentId: string,
    userId: string,
    isModerator: boolean = false
  ): Promise<void> {
    // Get comment
    const comment = await db.query.comments.findFirst({
      where: eq(comments.id, commentId),
    });

    if (!comment) {
      throw new AppError(404, 'Comment not found');
    }

    // Check permissions
    if (comment.authorId !== userId && !isModerator) {
      throw new AppError(403, 'You can only delete your own comments');
    }

    // Soft delete
    await db.update(comments)
      .set({ isDeleted: true })
      .where(eq(comments.id, commentId));
  }

  /**
   * Get a single comment by ID
   */
  async getCommentById(commentId: string, userId?: string): Promise<any> {
    const comment = await db.query.comments.findFirst({
      where: eq(comments.id, commentId),
      with: {
        author: {
          columns: {
            id: true,
            username: true,
            avatarStyle: true,
            avatarSeed: true,
          },
        },
        post: {
          columns: {
            id: true,
            slug: true,
            title: true,
          },
          with: {
            topic: {
              columns: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!comment) {
      throw new AppError(404, 'Comment not found');
    }

    // Get vote counts
    const voteList = await db.query.votes.findMany({
      where: eq(votes.commentId, comment.id),
    });

    const voteCount = voteList.reduce((sum, vote) => sum + vote.value, 0);
    const userVote = userId
      ? voteList.find((v) => v.userId === userId)?.value || 0
      : 0;

    // Count replies
    const replyList = await db.query.comments.findMany({
      where: eq(comments.parentId, comment.id),
    });

    return {
      ...comment,
      voteCount,
      userVote,
      _count: {
        replies: replyList.length,
        votes: voteList.length,
      },
    };
  }
}

export default new CommentService();
