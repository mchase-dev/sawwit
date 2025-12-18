import { db } from '../db';
import { topics, topicMembers, posts, users } from '../db/schema';
import { eq, and, inArray, desc, count as drizzleCount } from 'drizzle-orm';
import { generateTopicName } from '../utils/slugify';
import { isValidTopicName } from '../utils/validation';
import { AppError } from '../middleware/errorHandler';
import { PaginationParams } from '../types';
import modLogService from './modLogService';

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

class TopicService {
  /**
   * Create a new topic
   */
  async createTopic(
    userId: string,
    displayName: string,
    description: string,
    rules?: string
  ): Promise<any> {
    // Generate URL-friendly name
    const name = generateTopicName(displayName);

    if (!isValidTopicName(name)) {
      throw new AppError(
        400,
        'Topic name must be 3-30 characters, alphanumeric only'
      );
    }

    // Check if topic name already exists
    const existingTopic = await db.query.topics.findFirst({
      where: eq(topics.name, name),
    });

    if (existingTopic) {
      throw new AppError(409, 'Topic name already exists');
    }

    // Create topic
    const [createdTopic] = await db.insert(topics).values({
      name,
      displayName,
      description,
      rules: rules || null,
      ownerId: userId,
    }).returning();

    // Add creator as member
    await db.insert(topicMembers).values({
      topicId: createdTopic.id,
      userId,
      role: 'MEMBER',
    });

    // Fetch with relations
    const topic = await db.query.topics.findFirst({
      where: eq(topics.id, createdTopic.id),
      with: {
        owner: {
          columns: {
            username: true,
            avatarStyle: true,
            avatarSeed: true,
          },
        },
      },
    });

    // Count members and posts
    const [memberCount, postCount] = await Promise.all([
      db.select({ count: drizzleCount() })
        .from(topicMembers)
        .where(eq(topicMembers.topicId, createdTopic.id)),
      db.select({ count: drizzleCount() })
        .from(posts)
        .where(eq(posts.topicId, createdTopic.id)),
    ]);

    // Creator is automatically a member
    return {
      ...topic,
      isMember: true,
      memberRole: 'MEMBER',
      _count: {
        members: memberCount[0].count,
        posts: postCount[0].count,
      },
    };
  }

  /**
   * Get topic by name
   */
  async getTopic(name: string, userId?: string): Promise<any> {
    const topic = await db.query.topics.findFirst({
      where: eq(topics.name, name),
      with: {
        owner: {
          columns: {
            id: true,
            username: true,
            avatarStyle: true,
            avatarSeed: true,
          },
        },
      },
    });

    if (!topic) {
      throw new AppError(404, 'Topic not found');
    }

    // Count members and posts
    const [memberCount, postCount] = await Promise.all([
      db.select({ count: drizzleCount() })
        .from(topicMembers)
        .where(eq(topicMembers.topicId, topic.id)),
      db.select({ count: drizzleCount() })
        .from(posts)
        .where(eq(posts.topicId, topic.id)),
    ]);

    // Check if user is a member
    let isMember = false;
    let memberRole = null;
    if (userId) {
      const membership = await db.query.topicMembers.findFirst({
        where: and(
          eq(topicMembers.topicId, topic.id),
          eq(topicMembers.userId, userId)
        ),
      });
      isMember = !!membership;
      memberRole = membership?.role;
    }

    return {
      ...topic,
      isMember,
      memberRole,
      _count: {
        members: memberCount[0].count,
        posts: postCount[0].count,
      },
    };
  }

  /**
   * Get all topics with pagination
   */
  async getAllTopics(
    { page = 1, limit = 20 }: PaginationParams,
    sort: 'popular' | 'new' | 'active' = 'popular',
    userId?: string
  ): Promise<any> {
    const offset = (page - 1) * limit;

    // Set basic ordering (popular will be sorted after counting members)
    let orderBy: any = desc(topics.createdAt);
    if (sort === 'new') {
      orderBy = desc(topics.createdAt);
    } else if (sort === 'active') {
      orderBy = desc(topics.lastActivityAt);
    }

    const [topicList, totalResult] = await Promise.all([
      db.query.topics.findMany({
        with: {
          owner: {
            columns: {
              username: true,
            },
          },
        },
        orderBy,
        offset: sort === 'popular' ? 0 : offset, // For popular, fetch all then sort
        limit: sort === 'popular' ? undefined : limit,
      }),
      db.select({ count: drizzleCount() })
        .from(topics),
    ]);

    const total = totalResult[0].count;

    // Add counts for each topic
    const topicsWithCounts = await Promise.all(
      topicList.map(async (topic) => {
        const [memberCount, postCount] = await Promise.all([
          db.select({ count: drizzleCount() })
            .from(topicMembers)
            .where(eq(topicMembers.topicId, topic.id)),
          db.select({ count: drizzleCount() })
            .from(posts)
            .where(eq(posts.topicId, topic.id)),
        ]);

        return {
          ...topic,
          _count: {
            members: memberCount[0].count,
            posts: postCount[0].count,
          },
        };
      })
    );

    // Sort by popularity if needed
    let sortedTopics = topicsWithCounts;
    if (sort === 'popular') {
      sortedTopics = topicsWithCounts
        .sort((a, b) => b._count.members - a._count.members)
        .slice(offset, offset + limit);
    }

    // If userId is provided, check membership status for each topic
    let topicsWithMembership = sortedTopics;
    if (userId) {
      const topicIds = sortedTopics.map((t) => t.id);

      if (topicIds.length > 0) {
        const memberships = await db.query.topicMembers.findMany({
          where: and(
            eq(topicMembers.userId, userId),
            inArray(topicMembers.topicId, topicIds)
          ),
          columns: {
            topicId: true,
            role: true,
          },
        });

        const membershipMap = new Map(
          memberships.map((m) => [m.topicId, m.role])
        );

        topicsWithMembership = sortedTopics.map((topic) => ({
          ...topic,
          isMember: membershipMap.has(topic.id),
          memberRole: membershipMap.get(topic.id) || null,
        }));
      }
    }

    return {
      data: topicsWithMembership,
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
   * Update topic
   */
  async updateTopic(
    topicId: string,
    userId: string,
    data: {
      displayName?: string;
      description?: string;
      rules?: string;
    }
  ): Promise<any> {
    // Verify ownership
    const topic = await db.query.topics.findFirst({
      where: eq(topics.id, topicId),
    });

    if (!topic) {
      throw new AppError(404, 'Topic not found');
    }

    if (topic.ownerId !== userId) {
      throw new AppError(403, 'Only the topic owner can update the topic');
    }

    // Update topic
    await db.update(topics)
      .set(data)
      .where(eq(topics.id, topicId));

    // Fetch updated topic
    const updatedTopic = await db.query.topics.findFirst({
      where: eq(topics.id, topicId),
    });

    // Count members and posts
    const [memberCount, postCount] = await Promise.all([
      db.select({ count: drizzleCount() })
        .from(topicMembers)
        .where(eq(topicMembers.topicId, topicId)),
      db.select({ count: drizzleCount() })
        .from(posts)
        .where(eq(posts.topicId, topicId)),
    ]);

    return {
      ...updatedTopic,
      _count: {
        members: memberCount[0].count,
        posts: postCount[0].count,
      },
    };
  }

  /**
   * Delete topic
   */
  async deleteTopic(topicId: string, userId: string): Promise<void> {
    // Verify ownership
    const topic = await db.query.topics.findFirst({
      where: eq(topics.id, topicId),
    });

    if (!topic) {
      throw new AppError(404, 'Topic not found');
    }

    if (topic.ownerId !== userId) {
      throw new AppError(403, 'Only the topic owner can delete the topic');
    }

    // Delete topic (cascade will handle related records)
    await db.delete(topics)
      .where(eq(topics.id, topicId));
  }

  /**
   * Join a topic
   */
  async joinTopic(topicId: string, userId: string): Promise<void> {
    // Check if already a member
    const existingMembership = await db.query.topicMembers.findFirst({
      where: and(
        eq(topicMembers.topicId, topicId),
        eq(topicMembers.userId, userId)
      ),
    });

    if (existingMembership) {
      if (existingMembership.isBanned) {
        throw new AppError(403, 'You are banned from this topic');
      }
      throw new AppError(400, 'Already a member of this topic');
    }

    // Add member
    await db.insert(topicMembers).values({
      topicId,
      userId,
      role: 'MEMBER',
    });

    // Update last activity
    await db.update(topics)
      .set({ lastActivityAt: new Date() })
      .where(eq(topics.id, topicId));
  }

  /**
   * Leave a topic
   */
  async leaveTopic(topicId: string, userId: string): Promise<void> {
    // Check if user is the owner
    const topic = await db.query.topics.findFirst({
      where: eq(topics.id, topicId),
    });

    if (!topic) {
      throw new AppError(404, 'Topic not found');
    }

    if (topic.ownerId === userId) {
      throw new AppError(400, 'Topic owner cannot leave the topic');
    }

    // Remove membership
    await db.delete(topicMembers)
      .where(and(
        eq(topicMembers.topicId, topicId),
        eq(topicMembers.userId, userId)
      ));
  }

  /**
   * Appoint a moderator
   */
  async appointModerator(
    topicId: string,
    ownerId: string,
    targetUserIdentifier: string
  ): Promise<void> {
    // Resolve targetUserId from username if needed
    const targetUserId = await resolveUserId(targetUserIdentifier);

    // Verify ownership
    const topic = await db.query.topics.findFirst({
      where: eq(topics.id, topicId),
    });

    if (!topic) {
      throw new AppError(404, 'Topic not found');
    }

    if (topic.ownerId !== ownerId) {
      throw new AppError(403, 'Only the topic owner can appoint moderators');
    }

    // Check if target is a member
    const membership = await db.query.topicMembers.findFirst({
      where: and(
        eq(topicMembers.topicId, topicId),
        eq(topicMembers.userId, targetUserId)
      ),
    });

    if (!membership) {
      throw new AppError(400, 'User is not a member of this topic');
    }

    if (membership.role === 'MODERATOR') {
      throw new AppError(400, 'User is already a moderator');
    }

    // Update role
    await db.update(topicMembers)
      .set({ role: 'MODERATOR' })
      .where(and(
        eq(topicMembers.topicId, topicId),
        eq(topicMembers.userId, targetUserId)
      ));

    // Log moderator appointment
    await modLogService.createLog({
      moderatorId: ownerId,
      topicId,
      action: 'ADD_MODERATOR',
      targetType: 'USER',
      targetId: targetUserId,
      reason: 'Appointed as moderator',
    });
  }

  /**
   * Remove a moderator
   */
  async removeModerator(
    topicId: string,
    ownerId: string,
    targetUserIdentifier: string
  ): Promise<void> {
    // Resolve targetUserId from username if needed
    const targetUserId = await resolveUserId(targetUserIdentifier);

    // Verify ownership
    const topic = await db.query.topics.findFirst({
      where: eq(topics.id, topicId),
    });

    if (!topic) {
      throw new AppError(404, 'Topic not found');
    }

    if (topic.ownerId !== ownerId) {
      throw new AppError(403, 'Only the topic owner can remove moderators');
    }

    // Update role
    await db.update(topicMembers)
      .set({ role: 'MEMBER' })
      .where(and(
        eq(topicMembers.topicId, topicId),
        eq(topicMembers.userId, targetUserId)
      ));
  }

  /**
   * Ban a user from a topic
   */
  async banUser(
    topicId: string,
    _moderatorId: string,
    targetUserIdentifier: string
  ): Promise<void> {
    // Resolve targetUserId from username if needed
    const targetUserId = await resolveUserId(targetUserIdentifier);

    // Check if target is a member
    const membership = await db.query.topicMembers.findFirst({
      where: and(
        eq(topicMembers.topicId, topicId),
        eq(topicMembers.userId, targetUserId)
      ),
    });

    if (!membership) {
      throw new AppError(400, 'User is not a member of this topic');
    }

    if (membership.isBanned) {
      throw new AppError(400, 'User is already banned');
    }

    // Ban user
    await db.update(topicMembers)
      .set({ isBanned: true })
      .where(and(
        eq(topicMembers.topicId, topicId),
        eq(topicMembers.userId, targetUserId)
      ));
  }

  /**
   * Unban a user from a topic
   */
  async unbanUser(
    topicId: string,
    _moderatorId: string,
    targetUserIdentifier: string
  ): Promise<void> {
    // Resolve targetUserId from username if needed
    const targetUserId = await resolveUserId(targetUserIdentifier);

    // Check if target is a member
    const membership = await db.query.topicMembers.findFirst({
      where: and(
        eq(topicMembers.topicId, topicId),
        eq(topicMembers.userId, targetUserId)
      ),
    });

    if (!membership) {
      throw new AppError(400, 'User is not a member of this topic');
    }

    if (!membership.isBanned) {
      throw new AppError(400, 'User is not banned');
    }

    // Unban user
    await db.update(topicMembers)
      .set({ isBanned: false })
      .where(and(
        eq(topicMembers.topicId, topicId),
        eq(topicMembers.userId, targetUserId)
      ));
  }

  /**
   * Get banned users in a topic
   */
  async getBannedUsers(topicId: string): Promise<any[]> {
    const bannedMembers = await db.query.topicMembers.findMany({
      where: and(
        eq(topicMembers.topicId, topicId),
        eq(topicMembers.isBanned, true)
      ),
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
    });

    return bannedMembers.map((m) => ({
      userId: m.userId,
      user: m.user,
      bannedAt: m.joinedAt, // Using joinedAt as proxy since we don't have bannedAt
    }));
  }

  /**
   * Get user's topics (member of)
   */
  async getUserTopics(userId: string): Promise<any[]> {
    const memberships = await db.query.topicMembers.findMany({
      where: eq(topicMembers.userId, userId),
      with: {
        topic: true,
      },
    });

    // Add counts for each topic
    const topicsWithCounts = await Promise.all(
      memberships.map(async (m) => {
        const [memberCount, postCount] = await Promise.all([
          db.select({ count: drizzleCount() })
            .from(topicMembers)
            .where(eq(topicMembers.topicId, m.topic.id)),
          db.select({ count: drizzleCount() })
            .from(posts)
            .where(eq(posts.topicId, m.topic.id)),
        ]);

        return {
          ...m.topic,
          role: m.role,
          _count: {
            members: memberCount[0].count,
            posts: postCount[0].count,
          },
        };
      })
    );

    return topicsWithCounts;
  }

  /**
   * Get topics user moderates
   */
  async getModeratedTopics(userId: string): Promise<any[]> {
    const memberships = await db.query.topicMembers.findMany({
      where: and(
        eq(topicMembers.userId, userId),
        eq(topicMembers.role, 'MODERATOR')
      ),
      with: {
        topic: true,
      },
    });

    // Add counts for each topic
    const topicsWithCounts = await Promise.all(
      memberships.map(async (m) => {
        const [memberCount, postCount] = await Promise.all([
          db.select({ count: drizzleCount() })
            .from(topicMembers)
            .where(eq(topicMembers.topicId, m.topic.id)),
          db.select({ count: drizzleCount() })
            .from(posts)
            .where(eq(posts.topicId, m.topic.id)),
        ]);

        return {
          ...m.topic,
          _count: {
            members: memberCount[0].count,
            posts: postCount[0].count,
          },
        };
      })
    );

    return topicsWithCounts;
  }
}

export default new TopicService();
