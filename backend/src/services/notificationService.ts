import { db } from '../db';
import { users, notifications } from '../db/schema';
import { eq, and, desc, count as drizzleCount } from 'drizzle-orm';
import { AppError } from '../middleware/errorHandler';
import { PaginationParams } from '../types';

// Import enum types from schema
type NotificationType = 'COMMENT_ON_POST' | 'POST_IN_OWNED_TOPIC' | 'MODERATOR_ADDED' | 'MODERATOR_REMOVED' | 'BANNED_FROM_TOPIC' | 'USER_MENTIONED' | 'DIRECT_MESSAGE';

class NotificationService {
  /**
   * Create a new notification
   */
  async createNotification(
    userId: string,
    type: NotificationType,
    message: string,
    relatedId?: string
  ): Promise<any> {
    // Verify user exists
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Create notification
    const [notification] = await db.insert(notifications).values({
      userId,
      type,
      message,
      relatedId: relatedId || null,
    }).returning();

    return notification;
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(
    userId: string,
    { page = 1, limit = 20 }: PaginationParams,
    statusFilter?: 'read' | 'unread'
  ): Promise<any> {
    const offset = (page - 1) * limit;

    // Build where condition
    let whereCondition;
    if (statusFilter === 'read') {
      whereCondition = and(eq(notifications.userId, userId), eq(notifications.status, 'READ'));
    } else if (statusFilter === 'unread') {
      whereCondition = and(eq(notifications.userId, userId), eq(notifications.status, 'UNREAD'));
    } else {
      whereCondition = eq(notifications.userId, userId);
    }

    const [notificationList, totalResult, unreadResult] = await Promise.all([
      db.query.notifications.findMany({
        where: whereCondition,
        orderBy: desc(notifications.createdAt),
        offset,
        limit,
      }),
      db.select({ count: drizzleCount() })
        .from(notifications)
        .where(whereCondition),
      db.select({ count: drizzleCount() })
        .from(notifications)
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.status, 'UNREAD')
        )),
    ]);

    const total = totalResult[0].count;
    const unreadCount = unreadResult[0].count;

    return {
      data: notificationList,
      unreadCount,
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
   * Mark a notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    // Verify notification belongs to user
    const notification = await db.query.notifications.findFirst({
      where: eq(notifications.id, notificationId),
    });

    if (!notification) {
      throw new AppError(404, 'Notification not found');
    }

    if (notification.userId !== userId) {
      throw new AppError(403, 'You can only mark your own notifications as read');
    }

    // Mark as read
    await db.update(notifications)
      .set({ status: 'READ' })
      .where(eq(notifications.id, notificationId));
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    await db.update(notifications)
      .set({ status: 'READ' })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.status, 'UNREAD')
      ));
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    // Verify notification belongs to user
    const notification = await db.query.notifications.findFirst({
      where: eq(notifications.id, notificationId),
    });

    if (!notification) {
      throw new AppError(404, 'Notification not found');
    }

    if (notification.userId !== userId) {
      throw new AppError(403, 'You can only delete your own notifications');
    }

    // Mark as deleted
    await db.update(notifications)
      .set({ status: 'DELETED' })
      .where(eq(notifications.id, notificationId));
  }

  /**
   * Delete all read notifications for a user
   */
  async deleteAllRead(userId: string): Promise<void> {
    await db.update(notifications)
      .set({ status: 'DELETED' })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.status, 'READ')
      ));
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    const result = await db.select({ count: drizzleCount() })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.status, 'UNREAD')
      ));
    return result[0].count;
  }

  /**
   * Helper: Notify user when their post receives a comment
   */
  async notifyPostComment(
    postAuthorId: string,
    commentAuthorId: string,
    postId: string
  ): Promise<void> {
    // Don't notify if user commented on their own post
    if (postAuthorId === commentAuthorId) {
      return;
    }

    const commentAuthor = await db.query.users.findFirst({
      where: eq(users.id, commentAuthorId),
      columns: { username: true },
    });

    if (!commentAuthor) return;

    await this.createNotification(
      postAuthorId,
      'COMMENT_ON_POST',
      `${commentAuthor.username} commented on your post`,
      postId
    );
  }

  /**
   * Helper: Notify user when their comment receives a reply
   */
  async notifyCommentReply(
    parentCommentAuthorId: string,
    replyAuthorId: string,
    commentId: string
  ): Promise<void> {
    // Don't notify if user replied to their own comment
    if (parentCommentAuthorId === replyAuthorId) {
      return;
    }

    const replyAuthor = await db.query.users.findFirst({
      where: eq(users.id, replyAuthorId),
      columns: { username: true },
    });

    if (!replyAuthor) return;

    await this.createNotification(
      parentCommentAuthorId,
      'COMMENT_ON_POST',
      `${replyAuthor.username} replied to your comment`,
      commentId
    );
  }

  /**
   * Helper: Notify user when they are mentioned
   */
  async notifyMention(
    mentionedUserId: string,
    mentionerUserId: string,
    relatedId: string
  ): Promise<void> {
    // Don't notify if user mentioned themselves
    if (mentionedUserId === mentionerUserId) {
      return;
    }

    const mentioner = await db.query.users.findFirst({
      where: eq(users.id, mentionerUserId),
      columns: { username: true },
    });

    if (!mentioner) return;

    await this.createNotification(
      mentionedUserId,
      'USER_MENTIONED',
      `${mentioner.username} mentioned you`,
      relatedId
    );
  }

  /**
   * Helper: Notify user when they are appointed as moderator
   */
  async notifyModeratorAppointment(
    userId: string,
    topicId: string,
    topicName: string
  ): Promise<void> {
    await this.createNotification(
      userId,
      'MODERATOR_ADDED',
      `You have been appointed as a moderator of ${topicName}`,
      topicId
    );
  }

  /**
   * Helper: Notify user when they are removed as moderator
   */
  async notifyModeratorRemoval(
    userId: string,
    topicId: string,
    topicName: string
  ): Promise<void> {
    await this.createNotification(
      userId,
      'MODERATOR_REMOVED',
      `You have been removed as a moderator of ${topicName}`,
      topicId
    );
  }

  /**
   * Helper: Notify user when they receive a direct message
   */
  async notifyDirectMessage(
    recipientId: string,
    senderId: string,
    messageId: string
  ): Promise<void> {
    // Don't notify if user sent message to themselves
    if (recipientId === senderId) {
      return;
    }

    const sender = await db.query.users.findFirst({
      where: eq(users.id, senderId),
      columns: { username: true },
    });

    if (!sender) return;

    await this.createNotification(
      recipientId,
      'DIRECT_MESSAGE',
      `${sender.username} sent you a message`,
      messageId
    );
  }

  /**
   * Helper: Notify user when they are banned from a topic
   */
  async notifyTopicBan(
    userId: string,
    topicId: string,
    topicName: string,
    reason?: string
  ): Promise<void> {
    const message = reason
      ? `You have been banned from ${topicName}. Reason: ${reason}`
      : `You have been banned from ${topicName}`;

    await this.createNotification(
      userId,
      'BANNED_FROM_TOPIC',
      message,
      topicId
    );
  }

  /**
   * Helper: Notify topic owner when a post is created in their topic
   */
  async notifyPostInTopic(
    topicOwnerId: string,
    postAuthorId: string,
    postId: string,
    topicName: string
  ): Promise<void> {
    // Don't notify if owner posted in their own topic
    if (topicOwnerId === postAuthorId) {
      return;
    }

    const author = await db.query.users.findFirst({
      where: eq(users.id, postAuthorId),
      columns: { username: true },
    });

    if (!author) return;

    await this.createNotification(
      topicOwnerId,
      'POST_IN_OWNED_TOPIC',
      `${author.username} posted in ${topicName}`,
      postId
    );
  }
}

export default new NotificationService();
