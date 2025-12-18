import { db } from '../db';
import { users, posts, comments, votes } from '../db/schema';
import { eq, and, desc, sql, SQL } from 'drizzle-orm';
import { AppError } from '../middleware/errorHandler';

class VoteService {
  /**
   * Helper to create the correct where clause for vote unique constraint
   */
  private getVoteWhereClause(userId: string, postId?: string, commentId?: string): SQL {
    if (postId) {
      return and(eq(votes.userId, userId), eq(votes.postId, postId))!;
    } else if (commentId) {
      return and(eq(votes.userId, userId), eq(votes.commentId, commentId))!;
    }
    throw new AppError(400, 'Either postId or commentId must be provided');
  }

  /**
   * Upvote a post or comment
   */
  async upvote(
    userId: string,
    postId?: string,
    commentId?: string
  ): Promise<void> {
    if (!postId && !commentId) {
      throw new AppError(400, 'Either postId or commentId must be provided');
    }

    if (postId && commentId) {
      throw new AppError(400, 'Cannot vote on both post and comment at once');
    }

    // Check if post/comment exists
    if (postId) {
      const post = await db.query.posts.findFirst({
        where: eq(posts.id, postId),
      });

      if (!post || post.isDeleted) {
        throw new AppError(404, 'Post not found');
      }

      if (post.authorId === userId) {
        throw new AppError(403, 'You cannot vote on your own post');
      }
    }

    if (commentId) {
      const comment = await db.query.comments.findFirst({
        where: eq(comments.id, commentId),
      });

      if (!comment || comment.isDeleted) {
        throw new AppError(404, 'Comment not found');
      }

      if (comment.authorId === userId) {
        throw new AppError(403, 'You cannot vote on your own comment');
      }
    }

    // Check if user has already voted
    const existingVote = await db.query.votes.findFirst({
      where: this.getVoteWhereClause(userId, postId, commentId),
    });

    if (existingVote) {
      if (existingVote.value === 1) {
        throw new AppError(400, 'You have already upvoted this');
      }

      // Change downvote to upvote
      await db.update(votes)
        .set({ value: 1 })
        .where(this.getVoteWhereClause(userId, postId, commentId));

      // Update cred (change from -1 to +1, net +2)
      await this.updateCredScore(postId, commentId, 2);
    } else {
      // Create new upvote
      await db.insert(votes).values({
        userId,
        postId: postId || null,
        commentId: commentId || null,
        value: 1,
      });

      // Update cred (+1)
      await this.updateCredScore(postId, commentId, 1);
    }
  }

  /**
   * Downvote a post or comment
   */
  async downvote(
    userId: string,
    postId?: string,
    commentId?: string
  ): Promise<void> {
    if (!postId && !commentId) {
      throw new AppError(400, 'Either postId or commentId must be provided');
    }

    if (postId && commentId) {
      throw new AppError(400, 'Cannot vote on both post and comment at once');
    }

    // Check if post/comment exists
    if (postId) {
      const post = await db.query.posts.findFirst({
        where: eq(posts.id, postId),
      });

      if (!post || post.isDeleted) {
        throw new AppError(404, 'Post not found');
      }

      if (post.authorId === userId) {
        throw new AppError(403, 'You cannot vote on your own post');
      }
    }

    if (commentId) {
      const comment = await db.query.comments.findFirst({
        where: eq(comments.id, commentId),
      });

      if (!comment || comment.isDeleted) {
        throw new AppError(404, 'Comment not found');
      }

      if (comment.authorId === userId) {
        throw new AppError(403, 'You cannot vote on your own comment');
      }
    }

    // Check if user has already voted
    const existingVote = await db.query.votes.findFirst({
      where: this.getVoteWhereClause(userId, postId, commentId),
    });

    if (existingVote) {
      if (existingVote.value === -1) {
        throw new AppError(400, 'You have already downvoted this');
      }

      // Change upvote to downvote
      await db.update(votes)
        .set({ value: -1 })
        .where(this.getVoteWhereClause(userId, postId, commentId));

      // Update cred (change from +1 to -1, net -2)
      await this.updateCredScore(postId, commentId, -2);
    } else {
      // Create new downvote
      await db.insert(votes).values({
        userId,
        postId: postId || null,
        commentId: commentId || null,
        value: -1,
      });

      // Update cred (-1)
      await this.updateCredScore(postId, commentId, -1);
    }
  }

  /**
   * Remove a vote (unvote)
   */
  async removeVote(
    userId: string,
    postId?: string,
    commentId?: string
  ): Promise<void> {
    if (!postId && !commentId) {
      throw new AppError(400, 'Either postId or commentId must be provided');
    }

    if (postId && commentId) {
      throw new AppError(400, 'Cannot unvote both post and comment at once');
    }

    // Check if vote exists
    const existingVote = await db.query.votes.findFirst({
      where: this.getVoteWhereClause(userId, postId, commentId),
    });

    if (!existingVote) {
      throw new AppError(400, 'You have not voted on this');
    }

    // Delete vote
    await db.delete(votes)
      .where(this.getVoteWhereClause(userId, postId, commentId));

    // Update cred (reverse the vote value)
    await this.updateCredScore(postId, commentId, -existingVote.value);
  }

  /**
   * Get user's vote on a post or comment
   */
  async getUserVote(
    userId: string,
    postId?: string,
    commentId?: string
  ): Promise<number> {
    if (!postId && !commentId) {
      throw new AppError(400, 'Either postId or commentId must be provided');
    }

    const vote = await db.query.votes.findFirst({
      where: this.getVoteWhereClause(userId, postId, commentId),
    });

    return vote ? vote.value : 0;
  }

  /**
   * Get vote count for a post or comment
   */
  async getVoteCount(postId?: string, commentId?: string): Promise<number> {
    if (!postId && !commentId) {
      throw new AppError(400, 'Either postId or commentId must be provided');
    }

    const whereCondition = postId
      ? eq(votes.postId, postId)
      : eq(votes.commentId, commentId!);

    const voteList = await db.query.votes.findMany({
      where: whereCondition,
    });

    return voteList.reduce((sum, vote) => sum + vote.value, 0);
  }

  /**
   * Get upvote and downvote counts separately
   */
  async getVoteCounts(
    postId?: string,
    commentId?: string
  ): Promise<{ upvotes: number; downvotes: number; total: number }> {
    if (!postId && !commentId) {
      throw new AppError(400, 'Either postId or commentId must be provided');
    }

    const whereCondition = postId
      ? eq(votes.postId, postId)
      : eq(votes.commentId, commentId!);

    const voteList = await db.query.votes.findMany({
      where: whereCondition,
    });

    const upvotes = voteList.filter((v) => v.value === 1).length;
    const downvotes = voteList.filter((v) => v.value === -1).length;
    const total = upvotes - downvotes;

    return { upvotes, downvotes, total };
  }

  /**
   * Update cred score for post or comment author
   */
  private async updateCredScore(
    postId: string | undefined,
    commentId: string | undefined,
    delta: number
  ): Promise<void> {
    if (postId) {
      // Get post author
      const post = await db.query.posts.findFirst({
        where: eq(posts.id, postId),
        columns: { authorId: true },
      });

      if (post) {
        // Update postCred using SQL increment
        await db.update(users)
          .set({ postCred: sql`${users.postCred} + ${delta}` })
          .where(eq(users.id, post.authorId));
      }
    }

    if (commentId) {
      // Get comment author
      const comment = await db.query.comments.findFirst({
        where: eq(comments.id, commentId),
        columns: { authorId: true },
      });

      if (comment) {
        // Update commentCred using SQL increment
        await db.update(users)
          .set({ commentCred: sql`${users.commentCred} + ${delta}` })
          .where(eq(users.id, comment.authorId));
      }
    }
  }

  /**
   * Get top voters for a post or comment (for analytics)
   */
  async getTopVoters(
    postId?: string,
    commentId?: string,
    limit: number = 10
  ): Promise<any[]> {
    if (!postId && !commentId) {
      throw new AppError(400, 'Either postId or commentId must be provided');
    }

    const whereCondition = postId
      ? eq(votes.postId, postId)
      : eq(votes.commentId, commentId!);

    const voteList = await db.query.votes.findMany({
      where: whereCondition,
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
      limit,
      orderBy: desc(votes.createdAt),
    });

    return voteList.map((vote) => ({
      user: vote.user,
      value: vote.value,
      createdAt: vote.createdAt,
    }));
  }
}

export default new VoteService();
