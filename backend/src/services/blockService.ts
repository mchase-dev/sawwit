import { db } from '../db';
import { users, userBlocks } from '../db/schema';
import { eq, and, or, desc, count as drizzleCount } from 'drizzle-orm';
import { AppError } from '../middleware/errorHandler';
import { PaginationParams } from '../types';

// Helper to check if a string is a valid UUID
const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

// Helper to resolve user identifier (username or UUID) to user ID
const resolveUserId = async (identifier: string): Promise<string> => {
  if (isUuid(identifier)) {
    return identifier;
  }
  const user = await db.query.users.findFirst({
    where: eq(users.username, identifier),
    columns: { id: true },
  });
  if (!user) {
    throw new AppError(404, 'User not found');
  }
  return user.id;
};

class BlockService {
  /**
   * Block a user
   */
  async blockUser(blockerId: string, blockedIdentifier: string): Promise<void> {
    // Resolve blockedId from username if needed
    const blockedId = await resolveUserId(blockedIdentifier);

    // Validate
    if (blockerId === blockedId) {
      throw new AppError(400, 'Cannot block yourself');
    }

    // Check if blocked user exists
    const blockedUser = await db.query.users.findFirst({
      where: eq(users.id, blockedId),
    });

    if (!blockedUser) {
      throw new AppError(404, 'User not found');
    }

    // Check if already blocked
    const existingBlock = await db.query.userBlocks.findFirst({
      where: and(
        eq(userBlocks.blockerId, blockerId),
        eq(userBlocks.blockedId, blockedId)
      ),
    });

    if (existingBlock) {
      throw new AppError(400, 'User is already blocked');
    }

    // Create block
    await db.insert(userBlocks).values({
      blockerId,
      blockedId,
    });
  }

  /**
   * Unblock a user
   */
  async unblockUser(blockerId: string, blockedIdentifier: string): Promise<void> {
    // Resolve blockedId from username if needed
    const blockedId = await resolveUserId(blockedIdentifier);

    // Check if block exists
    const block = await db.query.userBlocks.findFirst({
      where: and(
        eq(userBlocks.blockerId, blockerId),
        eq(userBlocks.blockedId, blockedId)
      ),
    });

    if (!block) {
      throw new AppError(400, 'User is not blocked');
    }

    // Remove block
    await db.delete(userBlocks)
      .where(and(
        eq(userBlocks.blockerId, blockerId),
        eq(userBlocks.blockedId, blockedId)
      ));
  }

  /**
   * Check if a user is blocked
   */
  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const block = await db.query.userBlocks.findFirst({
      where: and(
        eq(userBlocks.blockerId, blockerId),
        eq(userBlocks.blockedId, blockedId)
      ),
    });

    return !!block;
  }

  /**
   * Check if user A has blocked user B or vice versa
   */
  async isBlockedBidirectional(userAId: string, userBId: string): Promise<{
    aBlocksB: boolean;
    bBlocksA: boolean;
    eitherBlocked: boolean;
  }> {
    const [aBlocksB, bBlocksA] = await Promise.all([
      this.isBlocked(userAId, userBId),
      this.isBlocked(userBId, userAId),
    ]);

    return {
      aBlocksB,
      bBlocksA,
      eitherBlocked: aBlocksB || bBlocksA,
    };
  }

  /**
   * Get list of users blocked by a user
   */
  async getBlockedUsers(
    userId: string,
    { page = 1, limit = 20 }: PaginationParams
  ): Promise<any> {
    const offset = (page - 1) * limit;

    const [blocks, totalResult] = await Promise.all([
      db.query.userBlocks.findMany({
        where: eq(userBlocks.blockerId, userId),
        with: {
          blocked: {
            columns: {
              id: true,
              username: true,
              avatarStyle: true,
              avatarSeed: true,
            },
          },
        },
        orderBy: desc(userBlocks.createdAt),
        offset,
        limit,
      }),
      db.select({ count: drizzleCount() })
        .from(userBlocks)
        .where(eq(userBlocks.blockerId, userId)),
    ]);

    const total = totalResult[0].count;

    return {
      data: blocks.map((block) => ({
        user: block.blocked,
        blockedAt: block.createdAt,
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

  /**
   * Get count of users blocked by a user
   */
  async getBlockedCount(userId: string): Promise<number> {
    const result = await db.select({ count: drizzleCount() })
      .from(userBlocks)
      .where(eq(userBlocks.blockerId, userId));
    return result[0].count;
  }

  /**
   * Filter posts from blocked users
   */
  async filterBlockedPosts(userId: string, posts: any[]): Promise<any[]> {
    // Get all blocked user IDs
    const blocks = await db.query.userBlocks.findMany({
      where: eq(userBlocks.blockerId, userId),
      columns: { blockedId: true },
    });

    const blockedIds = new Set(blocks.map((b) => b.blockedId));

    // Filter out posts from blocked users
    return posts.filter((post) => !blockedIds.has(post.authorId));
  }

  /**
   * Filter comments from blocked users
   */
  async filterBlockedComments(userId: string, comments: any[]): Promise<any[]> {
    // Get all blocked user IDs
    const blocks = await db.query.userBlocks.findMany({
      where: eq(userBlocks.blockerId, userId),
      columns: { blockedId: true },
    });

    const blockedIds = new Set(blocks.map((b) => b.blockedId));

    // Recursively filter comments and their replies
    const filterRecursive = (commentList: any[]): any[] => {
      return commentList
        .filter((comment) => !blockedIds.has(comment.authorId))
        .map((comment) => ({
          ...comment,
          replies: comment.replies ? filterRecursive(comment.replies) : [],
        }));
    };

    return filterRecursive(comments);
  }

  /**
   * Get users who have blocked a specific user (admin only)
   */
  async getUsersWhoBlocked(
    blockedId: string,
    { page = 1, limit = 20 }: PaginationParams
  ): Promise<any> {
    const offset = (page - 1) * limit;

    const [blocks, totalResult] = await Promise.all([
      db.query.userBlocks.findMany({
        where: eq(userBlocks.blockedId, blockedId),
        with: {
          blocker: {
            columns: {
              id: true,
              username: true,
              avatarStyle: true,
              avatarSeed: true,
            },
          },
        },
        orderBy: desc(userBlocks.createdAt),
        offset,
        limit,
      }),
      db.select({ count: drizzleCount() })
        .from(userBlocks)
        .where(eq(userBlocks.blockedId, blockedId)),
    ]);

    const total = totalResult[0].count;

    return {
      data: blocks.map((block) => ({
        user: block.blocker,
        blockedAt: block.createdAt,
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

  /**
   * Clear all blocks for a user (useful for account deletion)
   */
  async clearAllBlocks(userId: string): Promise<void> {
    await db.delete(userBlocks)
      .where(or(
        eq(userBlocks.blockerId, userId),
        eq(userBlocks.blockedId, userId)
      ));
  }
}

export default new BlockService();
