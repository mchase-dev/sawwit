import { db } from '../db';
import { posts, comments, topicMembers, votes } from '../db/schema';
import { eq, and, gte, count as drizzleCount } from 'drizzle-orm';

interface TrendingTopic {
  id: string;
  name: string;
  displayName: string;
  description: string;
  memberCount: number;
  postCount: number;
  activityScore: number;
  growthRate: number;
}

interface TrendingPost {
  id: string;
  slug: string;
  title: string;
  content: string;
  createdAt: Date;
  voteCount: number;
  commentCount: number;
  viewCount: number;
  trendingScore: number;
}

class TrendingService {
  private topicCache: { data: TrendingTopic[]; timestamp: number } | null = null;
  private postCache: { data: TrendingPost[]; timestamp: number } | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Calculate trending score for a topic
   * Based on recent activity, growth rate, and engagement
   */
  private calculateTopicTrendingScore(
    recentPosts: number,
    recentMembers: number,
    totalMembers: number,
    activityScore: number
  ): number {
    // Weight recent activity heavily
    const postScore = recentPosts * 10;

    // Growth rate (new members relative to total)
    const growthRate = totalMembers > 0 ? recentMembers / totalMembers : 0;
    const growthScore = growthRate * 100;

    // Activity score (recent posts + comments)
    const activityWeight = activityScore * 5;

    return postScore + growthScore + activityWeight;
  }

  /**
   * Calculate trending score for a post
   */
  private calculatePostTrendingScore(
    voteCount: number,
    commentCount: number,
    viewCount: number,
    ageInHours: number
  ): number {
    // Engagement score
    const engagementScore = voteCount * 2 + commentCount * 5 + viewCount * 0.1;

    // Time decay (exponential)
    const timeDecay = Math.exp(-ageInHours / 24); // Half-life of ~17 hours

    // Velocity (engagement per hour)
    const velocity = engagementScore / Math.max(ageInHours, 1);

    return velocity * timeDecay * 1000; // Scale up for easier comparison
  }

  /**
   * Get trending topics
   */
  async getTrendingTopics(limit: number = 10, forceRefresh: boolean = false): Promise<TrendingTopic[]> {
    // Check cache
    if (
      !forceRefresh &&
      this.topicCache &&
      Date.now() - this.topicCache.timestamp < this.CACHE_TTL
    ) {
      return this.topicCache.data.slice(0, limit);
    }

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get all topics
    const topicList = await db.query.topics.findMany();

    // Calculate trending scores for each topic
    const trendingTopics: TrendingTopic[] = await Promise.all(
      topicList.map(async (topic) => {
        // Get member count
        const [memberCountResult] = await db.select({ count: drizzleCount() })
          .from(topicMembers)
          .where(eq(topicMembers.topicId, topic.id));
        const memberCount = memberCountResult.count;

        // Get post count
        const [postCountResult] = await db.select({ count: drizzleCount() })
          .from(posts)
          .where(eq(posts.topicId, topic.id));
        const postCount = postCountResult.count;

        // Get recent posts (last 24 hours)
        const [recentPostsResult] = await db.select({ count: drizzleCount() })
          .from(posts)
          .where(and(
            eq(posts.topicId, topic.id),
            gte(posts.createdAt, oneDayAgo),
            eq(posts.isDeleted, false)
          ));
        const recentPostsCount = recentPostsResult.count;

        // Get recent members (last week)
        const [recentMembersResult] = await db.select({ count: drizzleCount() })
          .from(topicMembers)
          .where(and(
            eq(topicMembers.topicId, topic.id),
            gte(topicMembers.joinedAt, oneWeekAgo)
          ));
        const recentMembersCount = recentMembersResult.count;

        // Calculate activity score (posts + comments in last 24h)
        // For comments, we need to join with posts to filter by topicId
        const recentCommentsList = await db.query.comments.findMany({
          where: and(
            gte(comments.createdAt, oneDayAgo),
            eq(comments.isDeleted, false)
          ),
          with: {
            post: {
              columns: {
                topicId: true,
              },
            },
          },
        });
        const recentCommentsCount = recentCommentsList.filter(c => c.post?.topicId === topic.id).length;

        const activityScore = recentPostsCount + recentCommentsCount;

        // Calculate growth rate
        const growthRate = memberCount > 0 ? recentMembersCount / memberCount : 0;

        // Calculate trending score
        const trendingScore = this.calculateTopicTrendingScore(
          recentPostsCount,
          recentMembersCount,
          memberCount,
          activityScore
        );

        return {
          id: topic.id,
          name: topic.name,
          displayName: topic.displayName,
          description: topic.description,
          memberCount,
          postCount,
          activityScore,
          growthRate,
          trendingScore,
        };
      })
    );

    // Sort by trending score
    const sorted = trendingTopics.sort((a: any, b: any) => b.trendingScore - a.trendingScore);

    // Update cache
    this.topicCache = {
      data: sorted,
      timestamp: Date.now(),
    };

    return sorted.slice(0, limit);
  }

  /**
   * Get trending posts across all topics
   */
  async getTrendingPosts(limit: number = 20, forceRefresh: boolean = false): Promise<any[]> {
    // Check cache
    if (
      !forceRefresh &&
      this.postCache &&
      Date.now() - this.postCache.timestamp < this.CACHE_TTL
    ) {
      return this.postCache.data.slice(0, limit);
    }

    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    // Get recent posts
    const postList = await db.query.posts.findMany({
      where: and(
        gte(posts.createdAt, threeDaysAgo),
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
            id: true,
            name: true,
            displayName: true,
          },
        },
        tag: true,
      },
    });

    // Calculate trending scores
    const trendingPosts = await Promise.all(
      postList.map(async (post) => {
        // Get comment count
        const [commentCountResult] = await db.select({ count: drizzleCount() })
          .from(comments)
          .where(eq(comments.postId, post.id));
        const commentCount = commentCountResult.count;

        // Get vote counts
        const voteList = await db.query.votes.findMany({
          where: eq(votes.postId, post.id),
        });

        const voteCount = voteList.reduce((sum, vote) => sum + vote.value, 0);

        // Calculate age in hours
        const ageInHours = (now.getTime() - post.createdAt.getTime()) / (1000 * 60 * 60);

        // For now, use 0 for viewCount (implement view tracking later)
        const viewCount = 0;

        const trendingScore = this.calculatePostTrendingScore(
          voteCount,
          commentCount,
          viewCount,
          ageInHours
        );

        return {
          ...post,
          voteCount,
          commentCount,
          viewCount,
          trendingScore,
        };
      })
    );

    // Sort by trending score
    const sorted = trendingPosts.sort((a, b) => b.trendingScore - a.trendingScore);

    // Update cache
    this.postCache = {
      data: sorted as any,
      timestamp: Date.now(),
    };

    return sorted.slice(0, limit);
  }

  /**
   * Get trending posts for a specific topic
   */
  async getTrendingPostsForTopic(topicId: string, limit: number = 20): Promise<any[]> {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    // Get recent posts from topic
    const postList = await db.query.posts.findMany({
      where: and(
        eq(posts.topicId, topicId),
        gte(posts.createdAt, threeDaysAgo),
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
            id: true,
            name: true,
            displayName: true,
          },
        },
        tag: true,
      },
    });

    // Calculate trending scores
    const trendingPosts = await Promise.all(
      postList.map(async (post) => {
        // Get comment count
        const [commentCountResult] = await db.select({ count: drizzleCount() })
          .from(comments)
          .where(eq(comments.postId, post.id));
        const commentCount = commentCountResult.count;

        // Get vote counts
        const voteList = await db.query.votes.findMany({
          where: eq(votes.postId, post.id),
        });

        const voteCount = voteList.reduce((sum, vote) => sum + vote.value, 0);

        // Calculate age in hours
        const ageInHours = (now.getTime() - post.createdAt.getTime()) / (1000 * 60 * 60);

        const viewCount = 0; // Implement later

        const trendingScore = this.calculatePostTrendingScore(
          voteCount,
          commentCount,
          viewCount,
          ageInHours
        );

        return {
          ...post,
          voteCount,
          commentCount,
          viewCount,
          trendingScore,
        };
      })
    );

    // Sort by trending score
    return trendingPosts
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, limit);
  }

  /**
   * Clear cache (call this when you want to force a refresh)
   */
  clearCache(): void {
    this.topicCache = null;
    this.postCache = null;
  }

  /**
   * Get cache status
   */
  getCacheStatus(): {
    topicCache: { exists: boolean; age: number | null };
    postCache: { exists: boolean; age: number | null };
  } {
    return {
      topicCache: {
        exists: !!this.topicCache,
        age: this.topicCache ? Date.now() - this.topicCache.timestamp : null,
      },
      postCache: {
        exists: !!this.postCache,
        age: this.postCache ? Date.now() - this.postCache.timestamp : null,
      },
    };
  }
}

export default new TrendingService();
