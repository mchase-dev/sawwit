import { db } from '../db';
import { topics, modLogs } from '../db/schema';
import { eq, and, desc, gte, lte, count as drizzleCount, SQL } from 'drizzle-orm';
import { AppError } from '../middleware/errorHandler';
import { PaginationParams } from '../types';

// Import enum types from schema
type ModAction = 'DELETE_POST' | 'DELETE_COMMENT' | 'BAN_USER' | 'UNBAN_USER' | 'PIN_POST' | 'UNPIN_POST' | 'REMOVE_POST' | 'REMOVE_COMMENT' | 'AWARD_BADGE' | 'REMOVE_BADGE' | 'ADD_MODERATOR' | 'REMOVE_MODERATOR';
type ModTargetType = 'POST' | 'COMMENT' | 'USER';

interface CreateLogParams {
  moderatorId: string;
  topicId: string;
  action: ModAction;
  targetType: ModTargetType;
  targetId: string;
  reason?: string;
  details?: string;
}

class ModLogService {
  /**
   * Create a moderation log entry
   */
  async createLog(params: CreateLogParams): Promise<any> {
    const { moderatorId, topicId, action, targetType, targetId, reason, details } = params;

    // Verify topic exists
    const topic = await db.query.topics.findFirst({
      where: eq(topics.id, topicId),
    });

    if (!topic) {
      throw new AppError(404, 'Topic not found');
    }

    // Create log entry
    const [createdLog] = await db.insert(modLogs).values({
      moderatorId,
      topicId,
      action,
      targetType,
      targetId,
      reason: reason || null,
      details: details || null,
    }).returning();

    // Fetch with relations
    const log = await db.query.modLogs.findFirst({
      where: eq(modLogs.id, createdLog.id),
      with: {
        moderator: {
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

    return log;
  }

  /**
   * Get mod logs for a topic
   */
  async getTopicLogs(
    topicId: string,
    { page = 1, limit = 50 }: PaginationParams,
    filters?: any
  ): Promise<any> {
    // Verify topic exists
    const topic = await db.query.topics.findFirst({
      where: eq(topics.id, topicId),
    });

    if (!topic) {
      throw new AppError(404, 'Topic not found');
    }

    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions: SQL[] = [eq(modLogs.topicId, topicId)];
    if (filters?.moderatorId) conditions.push(eq(modLogs.moderatorId, filters.moderatorId));
    if (filters?.action) conditions.push(eq(modLogs.action, filters.action));
    if (filters?.targetUserId) conditions.push(eq(modLogs.targetId, filters.targetUserId));
    if (filters?.startDate) conditions.push(gte(modLogs.createdAt, filters.startDate));
    if (filters?.endDate) conditions.push(lte(modLogs.createdAt, filters.endDate));

    const whereCondition = conditions.length > 1 ? and(...conditions) : conditions[0];

    const [logList, totalResult] = await Promise.all([
      db.query.modLogs.findMany({
        where: whereCondition,
        with: {
          moderator: {
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
        orderBy: desc(modLogs.createdAt),
        offset,
        limit,
      }),
      db.select({ count: drizzleCount() })
        .from(modLogs)
        .where(whereCondition),
    ]);

    const total = totalResult[0].count;

    return {
      data: logList,
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
   * Get mod logs by moderator
   */
  async getModeratorLogs(
    moderatorId: string,
    { page = 1, limit = 50 }: PaginationParams
  ): Promise<any> {
    const offset = (page - 1) * limit;

    const [logList, totalResult] = await Promise.all([
      db.query.modLogs.findMany({
        where: eq(modLogs.moderatorId, moderatorId),
        with: {
          topic: {
            columns: {
              id: true,
              name: true,
              displayName: true,
            },
          },
        },
        orderBy: desc(modLogs.createdAt),
        offset,
        limit,
      }),
      db.select({ count: drizzleCount() })
        .from(modLogs)
        .where(eq(modLogs.moderatorId, moderatorId)),
    ]);

    const total = totalResult[0].count;

    return {
      data: logList,
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
   * Get mod logs for a specific action type
   */
  async getLogsByAction(
    topicId: string,
    action: ModAction,
    { page = 1, limit = 50 }: PaginationParams
  ): Promise<any> {
    const offset = (page - 1) * limit;

    const [logList, totalResult] = await Promise.all([
      db.query.modLogs.findMany({
        where: and(
          eq(modLogs.topicId, topicId),
          eq(modLogs.action, action)
        ),
        with: {
          moderator: {
            columns: {
              id: true,
              username: true,
              avatarStyle: true,
              avatarSeed: true,
            },
          },
        },
        orderBy: desc(modLogs.createdAt),
        offset,
        limit,
      }),
      db.select({ count: drizzleCount() })
        .from(modLogs)
        .where(and(
          eq(modLogs.topicId, topicId),
          eq(modLogs.action, action)
        )),
    ]);

    const total = totalResult[0].count;

    return {
      data: logList,
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
   * Get mod logs for a specific target
   */
  async getTargetLogs(
    targetId: string,
    { page = 1, limit = 50 }: PaginationParams
  ): Promise<any> {
    const offset = (page - 1) * limit;

    const [logList, totalResult] = await Promise.all([
      db.query.modLogs.findMany({
        where: eq(modLogs.targetId, targetId),
        with: {
          moderator: {
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
        orderBy: desc(modLogs.createdAt),
        offset,
        limit,
      }),
      db.select({ count: drizzleCount() })
        .from(modLogs)
        .where(eq(modLogs.targetId, targetId)),
    ]);

    const total = totalResult[0].count;

    return {
      data: logList,
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
   * Get all moderation logs (admin only)
   */
  async getAllLogs(
    { page = 1, limit = 50 }: PaginationParams,
    filters?: any
  ): Promise<any> {
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions: SQL[] = [];
    if (filters?.topicId) conditions.push(eq(modLogs.topicId, filters.topicId));
    if (filters?.moderatorId) conditions.push(eq(modLogs.moderatorId, filters.moderatorId));
    if (filters?.action) conditions.push(eq(modLogs.action, filters.action));
    if (filters?.startDate) conditions.push(gte(modLogs.createdAt, filters.startDate));
    if (filters?.endDate) conditions.push(lte(modLogs.createdAt, filters.endDate));

    const whereCondition = conditions.length > 0
      ? (conditions.length > 1 ? and(...conditions) : conditions[0])
      : undefined;

    const [logList, totalResult] = await Promise.all([
      db.query.modLogs.findMany({
        where: whereCondition,
        with: {
          moderator: {
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
        orderBy: desc(modLogs.createdAt),
        offset,
        limit,
      }),
      whereCondition
        ? db.select({ count: drizzleCount() }).from(modLogs).where(whereCondition)
        : db.select({ count: drizzleCount() }).from(modLogs),
    ]);

    const total = totalResult[0].count;

    return {
      data: logList,
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
   * Get moderation statistics for a topic
   */
  async getTopicStats(topicId: string): Promise<any> {
    const logList = await db.query.modLogs.findMany({
      where: eq(modLogs.topicId, topicId),
      columns: {
        action: true,
      },
    });

    const stats = logList.reduce((acc: any, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {});

    return {
      totalActions: logList.length,
      actionBreakdown: stats,
    };
  }

  /**
   * Get moderation statistics for a moderator
   */
  async getModeratorStats(moderatorId: string): Promise<any> {
    const logList = await db.query.modLogs.findMany({
      where: eq(modLogs.moderatorId, moderatorId),
      columns: {
        action: true,
      },
    });

    const stats = logList.reduce((acc: any, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {});

    return {
      totalActions: logList.length,
      actionBreakdown: stats,
    };
  }
}

export default new ModLogService();
