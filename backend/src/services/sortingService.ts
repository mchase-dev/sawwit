import { db } from '../db';
import { votes } from '../db/schema';
import { inArray } from 'drizzle-orm';

class SortingService {
  /**
   * Calculate Hot score
   * Balances upvotes and recency
   */
  calculateHotScore(
    upvotes: number,
    downvotes: number,
    createdAt: Date
  ): number {
    const score = upvotes - downvotes;
    const order = Math.log10(Math.max(Math.abs(score), 1));
    const sign = score > 0 ? 1 : score < 0 ? -1 : 0;
    const seconds = createdAt.getTime() / 1000 - 1134028003; // Epoch
    return sign * order + seconds / 45000;
  }

  /**
   * Calculate Wilson score (Best algorithm)
   * Confidence sort - used for "Best" sorting
   */
  calculateWilsonScore(upvotes: number, downvotes: number): number {
    if (upvotes === 0 && downvotes === 0) return 0;

    const n = upvotes + downvotes;
    const z = 1.96; // 95% confidence
    const phat = upvotes / n;

    return (
      (phat +
        (z * z) / (2 * n) -
        z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * n)) / n)) /
      (1 + (z * z) / n)
    );
  }

  /**
   * Calculate Controversy score
   * Higher when upvotes and downvotes are close
   */
  calculateControversyScore(upvotes: number, downvotes: number): number {
    if (upvotes === 0 || downvotes === 0) return 0;

    const magnitude = upvotes + downvotes;
    const balance =
      upvotes > downvotes
        ? downvotes / upvotes
        : upvotes / downvotes;

    return magnitude * balance;
  }

  /**
   * Calculate Rising score
   * Recent posts with growing engagement
   */
  calculateRisingScore(
    upvotes: number,
    downvotes: number,
    createdAt: Date,
    commentCount: number
  ): number {
    const ageInHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);

    // Only consider posts from last 24 hours
    if (ageInHours > 24) return 0;

    const score = upvotes - downvotes;
    const velocity = (score + commentCount) / Math.max(ageInHours, 1);

    return velocity * Math.exp(-ageInHours / 12); // Exponential decay
  }

  /**
   * Sort posts by Hot algorithm
   */
  async sortPostsByHot(posts: any[]): Promise<any[]> {
    // Get votes for all posts
    const postIds = posts.map((p) => p.id);
    const voteList = await db.query.votes.findMany({
      where: inArray(votes.postId, postIds),
    });

    // Group votes by post
    const votesByPost = new Map<string, { upvotes: number; downvotes: number }>();
    voteList.forEach((vote) => {
      if (!vote.postId) return;

      if (!votesByPost.has(vote.postId)) {
        votesByPost.set(vote.postId, { upvotes: 0, downvotes: 0 });
      }

      const counts = votesByPost.get(vote.postId)!;
      if (vote.value === 1) counts.upvotes++;
      if (vote.value === -1) counts.downvotes++;
    });

    // Calculate hot scores and sort
    return posts
      .map((post) => {
        const counts = votesByPost.get(post.id) || { upvotes: 0, downvotes: 0 };
        const hotScore = this.calculateHotScore(
          counts.upvotes,
          counts.downvotes,
          post.createdAt
        );
        return { ...post, hotScore };
      })
      .sort((a, b) => b.hotScore - a.hotScore);
  }

  /**
   * Sort posts by Top (highest score)
   */
  async sortPostsByTop(posts: any[], timeframe?: 'day' | 'week' | 'month' | 'year' | 'all'): Promise<any[]> {
    let filteredPosts = posts;

    // Filter by timeframe if specified
    if (timeframe && timeframe !== 'all') {
      const now = new Date();
      const cutoff = new Date();

      switch (timeframe) {
        case 'day':
          cutoff.setDate(now.getDate() - 1);
          break;
        case 'week':
          cutoff.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoff.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          cutoff.setFullYear(now.getFullYear() - 1);
          break;
      }

      filteredPosts = posts.filter((p) => p.createdAt >= cutoff);
    }

    // Get votes for all posts
    const postIds = filteredPosts.map((p) => p.id);
    const voteList = await db.query.votes.findMany({
      where: inArray(votes.postId, postIds),
    });

    // Calculate scores
    const scoresByPost = new Map<string, number>();
    voteList.forEach((vote) => {
      if (!vote.postId) return;

      const current = scoresByPost.get(vote.postId) || 0;
      scoresByPost.set(vote.postId, current + vote.value);
    });

    // Sort by score
    return filteredPosts
      .map((post) => ({
        ...post,
        score: scoresByPost.get(post.id) || 0,
      }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Sort posts by Rising
   */
  async sortPostsByRising(posts: any[]): Promise<any[]> {
    // Get votes for all posts
    const postIds = posts.map((p) => p.id);
    const voteList = await db.query.votes.findMany({
      where: inArray(votes.postId, postIds),
    });

    // Group votes by post
    const votesByPost = new Map<string, { upvotes: number; downvotes: number }>();
    voteList.forEach((vote) => {
      if (!vote.postId) return;

      if (!votesByPost.has(vote.postId)) {
        votesByPost.set(vote.postId, { upvotes: 0, downvotes: 0 });
      }

      const counts = votesByPost.get(vote.postId)!;
      if (vote.value === 1) counts.upvotes++;
      if (vote.value === -1) counts.downvotes++;
    });

    // Calculate rising scores and sort
    return posts
      .map((post) => {
        const counts = votesByPost.get(post.id) || { upvotes: 0, downvotes: 0 };
        const commentCount = post._count?.comments || 0;
        const risingScore = this.calculateRisingScore(
          counts.upvotes,
          counts.downvotes,
          post.createdAt,
          commentCount
        );
        return { ...post, risingScore };
      })
      .sort((a, b) => b.risingScore - a.risingScore);
  }

  /**
   * Sort posts by Controversial
   */
  async sortPostsByControversial(posts: any[]): Promise<any[]> {
    // Get votes for all posts
    const postIds = posts.map((p) => p.id);
    const voteList = await db.query.votes.findMany({
      where: inArray(votes.postId, postIds),
    });

    // Group votes by post
    const votesByPost = new Map<string, { upvotes: number; downvotes: number }>();
    voteList.forEach((vote) => {
      if (!vote.postId) return;

      if (!votesByPost.has(vote.postId)) {
        votesByPost.set(vote.postId, { upvotes: 0, downvotes: 0 });
      }

      const counts = votesByPost.get(vote.postId)!;
      if (vote.value === 1) counts.upvotes++;
      if (vote.value === -1) counts.downvotes++;
    });

    // Calculate controversy scores and sort
    return posts
      .map((post) => {
        const counts = votesByPost.get(post.id) || { upvotes: 0, downvotes: 0 };
        const controversyScore = this.calculateControversyScore(
          counts.upvotes,
          counts.downvotes
        );
        return { ...post, controversyScore };
      })
      .sort((a, b) => b.controversyScore - a.controversyScore);
  }

  /**
   * Sort comments by Best (Wilson score)
   */
  async sortCommentsByBest(comments: any[]): Promise<any[]> {
    // Get votes for all comments
    const commentIds = comments.map((c) => c.id);
    const voteList = await db.query.votes.findMany({
      where: inArray(votes.commentId, commentIds),
    });

    // Group votes by comment
    const votesByComment = new Map<string, { upvotes: number; downvotes: number }>();
    voteList.forEach((vote) => {
      if (!vote.commentId) return;

      if (!votesByComment.has(vote.commentId)) {
        votesByComment.set(vote.commentId, { upvotes: 0, downvotes: 0 });
      }

      const counts = votesByComment.get(vote.commentId)!;
      if (vote.value === 1) counts.upvotes++;
      if (vote.value === -1) counts.downvotes++;
    });

    // Calculate Wilson scores and sort
    return comments
      .map((comment) => {
        const counts = votesByComment.get(comment.id) || { upvotes: 0, downvotes: 0 };
        const wilsonScore = this.calculateWilsonScore(counts.upvotes, counts.downvotes);
        return { ...comment, wilsonScore };
      })
      .sort((a, b) => b.wilsonScore - a.wilsonScore);
  }

  /**
   * Sort comments by Top (highest score)
   */
  async sortCommentsByTop(comments: any[]): Promise<any[]> {
    // Get votes for all comments
    const commentIds = comments.map((c) => c.id);
    const voteList = await db.query.votes.findMany({
      where: inArray(votes.commentId, commentIds),
    });

    // Calculate scores
    const scoresByComment = new Map<string, number>();
    voteList.forEach((vote) => {
      if (!vote.commentId) return;

      const current = scoresByComment.get(vote.commentId) || 0;
      scoresByComment.set(vote.commentId, current + vote.value);
    });

    // Sort by score
    return comments
      .map((comment) => ({
        ...comment,
        score: scoresByComment.get(comment.id) || 0,
      }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Sort comments by Controversial
   */
  async sortCommentsByControversial(comments: any[]): Promise<any[]> {
    // Get votes for all comments
    const commentIds = comments.map((c) => c.id);
    const voteList = await db.query.votes.findMany({
      where: inArray(votes.commentId, commentIds),
    });

    // Group votes by comment
    const votesByComment = new Map<string, { upvotes: number; downvotes: number }>();
    voteList.forEach((vote) => {
      if (!vote.commentId) return;

      if (!votesByComment.has(vote.commentId)) {
        votesByComment.set(vote.commentId, { upvotes: 0, downvotes: 0 });
      }

      const counts = votesByComment.get(vote.commentId)!;
      if (vote.value === 1) counts.upvotes++;
      if (vote.value === -1) counts.downvotes++;
    });

    // Calculate controversy scores and sort
    return comments
      .map((comment) => {
        const counts = votesByComment.get(comment.id) || { upvotes: 0, downvotes: 0 };
        const controversyScore = this.calculateControversyScore(
          counts.upvotes,
          counts.downvotes
        );
        return { ...comment, controversyScore };
      })
      .sort((a, b) => b.controversyScore - a.controversyScore);
  }

  /**
   * Sort comments by New (most recent first)
   */
  sortCommentsByNew(comments: any[]): any[] {
    return [...comments].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  /**
   * Sort comments by Old (oldest first)
   */
  sortCommentsByOld(comments: any[]): any[] {
    return [...comments].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
  }
}

export default new SortingService();
