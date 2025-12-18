import { db } from '../db';
import { userBadges, users } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { AppError } from '../middleware/errorHandler';

// Helper to check if a string is a valid UUID
const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

class BadgeService {
  /**
   * Award a badge to a user in a specific topic
   */
  async awardBadge(
    topicId: string,
    userIdentifier: string,
    text: string,
    awardedBy: string,
    textColor: string = '#FFFFFF',
    bgColor: string = '#0079D3'
  ): Promise<any> {
    // Resolve userId - if not a UUID, look up by username
    let userId = userIdentifier;
    if (!isUuid(userIdentifier)) {
      const user = await db.query.users.findFirst({
        where: eq(users.username, userIdentifier),
        columns: { id: true },
      });
      if (!user) {
        throw new AppError(404, 'User not found');
      }
      userId = user.id;
    }

    // Check if user already has a badge in this topic
    const existingBadge = await db.query.userBadges.findFirst({
      where: and(
        eq(userBadges.topicId, topicId),
        eq(userBadges.userId, userId)
      ),
    });

    if (existingBadge) {
      // Update existing badge
      await db.update(userBadges)
        .set({
          text,
          textColor,
          bgColor,
          awardedBy,
        })
        .where(and(
          eq(userBadges.topicId, topicId),
          eq(userBadges.userId, userId)
        ));

      return await db.query.userBadges.findFirst({
        where: and(
          eq(userBadges.topicId, topicId),
          eq(userBadges.userId, userId)
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
          topic: {
            columns: {
              id: true,
              name: true,
              displayName: true,
            },
          },
        },
      });
    }

    // Award new badge
    const [createdBadge] = await db.insert(userBadges).values({
      topicId,
      userId,
      text,
      textColor,
      bgColor,
      awardedBy,
    }).returning();

    const badge = await db.query.userBadges.findFirst({
      where: eq(userBadges.id, createdBadge.id),
      with: {
        user: {
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
      },
    });

    return badge;
  }

  /**
   * Get all badges for a user across all topics
   */
  async getUserBadges(userId: string): Promise<any[]> {
    const badges = await db.query.userBadges.findMany({
      where: eq(userBadges.userId, userId),
      with: {
        topic: {
          columns: {
            id: true,
            name: true,
            displayName: true,
          },
        },
      },
      orderBy: desc(userBadges.createdAt),
    });

    return badges;
  }

  /**
   * Get badge for user in specific topic
   */
  async getUserBadgeInTopic(userId: string, topicId: string): Promise<any | null> {
    const badge = await db.query.userBadges.findFirst({
      where: and(
        eq(userBadges.topicId, topicId),
        eq(userBadges.userId, userId)
      ),
      with: {
        topic: {
          columns: {
            id: true,
            name: true,
            displayName: true,
          },
        },
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

    return badge;
  }

  /**
   * Remove a badge from a user (moderator only)
   */
  async removeBadge(topicId: string, userIdentifier: string): Promise<void> {
    // Resolve userId - if not a UUID, look up by username
    let userId = userIdentifier;
    if (!isUuid(userIdentifier)) {
      const user = await db.query.users.findFirst({
        where: eq(users.username, userIdentifier),
        columns: { id: true },
      });
      if (!user) {
        throw new AppError(404, 'User not found');
      }
      userId = user.id;
    }

    const badge = await db.query.userBadges.findFirst({
      where: and(
        eq(userBadges.topicId, topicId),
        eq(userBadges.userId, userId)
      ),
    });

    if (!badge) {
      throw new AppError(404, 'Badge not found');
    }

    await db.delete(userBadges)
      .where(and(
        eq(userBadges.topicId, topicId),
        eq(userBadges.userId, userId)
      ));
  }

  /**
   * Get all badges in a topic
   */
  async getTopicBadges(topicId: string): Promise<any[]> {
    const badges = await db.query.userBadges.findMany({
      where: eq(userBadges.topicId, topicId),
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
      orderBy: desc(userBadges.createdAt),
    });

    return badges;
  }
}

export default new BadgeService();
