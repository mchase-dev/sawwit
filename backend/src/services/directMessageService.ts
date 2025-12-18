import { db } from '../db';
import { users, userBlocks, directMessages } from '../db/schema';
import { eq, and, or, desc, asc, like, count as drizzleCount } from 'drizzle-orm';
import { AppError } from '../middleware/errorHandler';
import { PaginationParams } from '../types';
import { sanitizeCommentContent } from '../utils/sanitize';
import notificationService from './notificationService';

class DirectMessageService {
  /**
   * Send a direct message
   */
  async sendMessage(
    senderId: string,
    recipientId: string,
    content: string,
    parentId?: string
  ): Promise<any> {
    // Validate sender and recipient
    if (senderId === recipientId) {
      throw new AppError(400, 'Cannot send message to yourself');
    }

    // Check if recipient exists
    const recipient = await db.query.users.findFirst({
      where: eq(users.id, recipientId),
    });

    if (!recipient) {
      throw new AppError(404, 'Recipient not found');
    }

    // Check if either user has blocked the other
    const [senderBlocked, recipientBlocked] = await Promise.all([
      db.query.userBlocks.findFirst({
        where: and(
          eq(userBlocks.blockerId, recipientId),
          eq(userBlocks.blockedId, senderId)
        ),
      }),
      db.query.userBlocks.findFirst({
        where: and(
          eq(userBlocks.blockerId, senderId),
          eq(userBlocks.blockedId, recipientId)
        ),
      }),
    ]);

    if (senderBlocked) {
      throw new AppError(403, 'You are blocked by this user');
    }

    if (recipientBlocked) {
      throw new AppError(403, 'You have blocked this user');
    }

    // If this is a reply, verify parent message exists
    if (parentId) {
      const parentMessage = await db.query.directMessages.findFirst({
        where: eq(directMessages.id, parentId),
      });

      if (!parentMessage) {
        throw new AppError(404, 'Parent message not found');
      }

      // Verify parent message is in the same conversation
      const participantsMatch =
        (parentMessage.senderId === senderId &&
          parentMessage.recipientId === recipientId) ||
        (parentMessage.senderId === recipientId &&
          parentMessage.recipientId === senderId);

      if (!participantsMatch) {
        throw new AppError(400, 'Parent message is not in this conversation');
      }
    }

    // Sanitize content
    const sanitizedContent = sanitizeCommentContent(content);

    // Create message
    const [createdMessage] = await db.insert(directMessages).values({
      senderId,
      recipientId,
      content: sanitizedContent,
      parentId,
    }).returning();

    // Fetch with relations
    const message = await db.query.directMessages.findFirst({
      where: eq(directMessages.id, createdMessage.id),
      with: {
        sender: {
          columns: {
            id: true,
            username: true,
            avatarStyle: true,
            avatarSeed: true,
          },
        },
        recipient: {
          columns: {
            id: true,
            username: true,
            avatarStyle: true,
            avatarSeed: true,
          },
        },
      },
    });

    // Notify recipient
    await notificationService.notifyDirectMessage(recipientId, senderId, message!.id);

    return message;
  }

  /**
   * Get conversations for a user
   */
  async getConversations(
    userId: string,
    { page = 1, limit = 20 }: PaginationParams
  ): Promise<any> {
    const offset = (page - 1) * limit;

    // Get all messages where user is sender or recipient
    const messages = await db.query.directMessages.findMany({
      where: or(
        eq(directMessages.senderId, userId),
        eq(directMessages.recipientId, userId)
      ),
      with: {
        sender: {
          columns: {
            id: true,
            username: true,
            avatarStyle: true,
            avatarSeed: true,
          },
        },
        recipient: {
          columns: {
            id: true,
            username: true,
            avatarStyle: true,
            avatarSeed: true,
          },
        },
      },
      orderBy: desc(directMessages.createdAt),
    });

    // Group messages by conversation partner
    const conversationMap = new Map<
      string,
      {
        partnerId: string;
        partner: any;
        lastMessage: any;
        unreadCount: number;
      }
    >();

    for (const message of messages) {
      const partnerId = message.senderId === userId ? message.recipientId : message.senderId;
      const partner = message.senderId === userId ? message.recipient : message.sender;

      if (!conversationMap.has(partnerId)) {
        // Count unread messages from this partner
        const unreadResult = await db.select({ count: drizzleCount() })
          .from(directMessages)
          .where(and(
            eq(directMessages.senderId, partnerId),
            eq(directMessages.recipientId, userId),
            eq(directMessages.isRead, false)
          ));

        conversationMap.set(partnerId, {
          partnerId,
          partner,
          lastMessage: message,
          unreadCount: unreadResult[0].count,
        });
      }
    }

    // Convert to array and sort by last message time
    const conversations = Array.from(conversationMap.values())
      .sort(
        (a, b) =>
          b.lastMessage.createdAt.getTime() - a.lastMessage.createdAt.getTime()
      )
      .slice(offset, offset + limit);

    return {
      data: conversations,
      pagination: {
        page,
        limit,
        total: conversationMap.size,
        totalPages: Math.ceil(conversationMap.size / limit),
        hasNextPage: offset + limit < conversationMap.size,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Get messages in a conversation
   */
  async getConversationMessages(
    userId: string,
    partnerId: string,
    { page = 1, limit = 50 }: PaginationParams
  ): Promise<any> {
    const offset = (page - 1) * limit;

    // Verify partner exists
    const partner = await db.query.users.findFirst({
      where: eq(users.id, partnerId),
    });

    if (!partner) {
      throw new AppError(404, 'User not found');
    }

    // Get messages between users
    const [messageList, totalResult] = await Promise.all([
      db.query.directMessages.findMany({
        where: or(
          and(
            eq(directMessages.senderId, userId),
            eq(directMessages.recipientId, partnerId)
          ),
          and(
            eq(directMessages.senderId, partnerId),
            eq(directMessages.recipientId, userId)
          )
        ),
        with: {
          sender: {
            columns: {
              id: true,
              username: true,
              avatarStyle: true,
              avatarSeed: true,
            },
          },
          recipient: {
            columns: {
              id: true,
              username: true,
              avatarStyle: true,
              avatarSeed: true,
            },
          },
          parent: {
            columns: {
              id: true,
              content: true,
              senderId: true,
            },
          },
        },
        orderBy: asc(directMessages.createdAt),
        offset,
        limit,
      }),
      db.select({ count: drizzleCount() })
        .from(directMessages)
        .where(or(
          and(
            eq(directMessages.senderId, userId),
            eq(directMessages.recipientId, partnerId)
          ),
          and(
            eq(directMessages.senderId, partnerId),
            eq(directMessages.recipientId, userId)
          )
        )),
    ]);

    const total = totalResult[0].count;

    // Mark messages from partner as read
    await db.update(directMessages)
      .set({ isRead: true })
      .where(and(
        eq(directMessages.senderId, partnerId),
        eq(directMessages.recipientId, userId),
        eq(directMessages.isRead, false)
      ));

    return {
      data: messageList,
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
   * Mark a message as read
   */
  async markAsRead(messageId: string, userId: string): Promise<void> {
    const message = await db.query.directMessages.findFirst({
      where: eq(directMessages.id, messageId),
    });

    if (!message) {
      throw new AppError(404, 'Message not found');
    }

    // Only recipient can mark as read
    if (message.recipientId !== userId) {
      throw new AppError(403, 'You can only mark messages sent to you as read');
    }

    await db.update(directMessages)
      .set({ isRead: true })
      .where(eq(directMessages.id, messageId));
  }

  /**
   * Mark all messages from a user as read
   */
  async markConversationAsRead(userId: string, partnerId: string): Promise<void> {
    await db.update(directMessages)
      .set({ isRead: true })
      .where(and(
        eq(directMessages.senderId, partnerId),
        eq(directMessages.recipientId, userId),
        eq(directMessages.isRead, false)
      ));
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await db.query.directMessages.findFirst({
      where: eq(directMessages.id, messageId),
    });

    if (!message) {
      throw new AppError(404, 'Message not found');
    }

    // Only sender can delete
    if (message.senderId !== userId) {
      throw new AppError(403, 'You can only delete messages you sent');
    }

    // Hard delete the message
    await db.delete(directMessages)
      .where(eq(directMessages.id, messageId));
  }

  /**
   * Get unread message count
   */
  async getUnreadCount(userId: string): Promise<number> {
    const result = await db.select({ count: drizzleCount() })
      .from(directMessages)
      .where(and(
        eq(directMessages.recipientId, userId),
        eq(directMessages.isRead, false)
      ));
    return result[0].count;
  }

  /**
   * Search messages
   */
  async searchMessages(
    userId: string,
    query: string,
    { page = 1, limit = 20 }: PaginationParams
  ): Promise<any> {
    const offset = (page - 1) * limit;

    const [messageList, totalResult] = await Promise.all([
      db.query.directMessages.findMany({
        where: and(
          or(
            eq(directMessages.senderId, userId),
            eq(directMessages.recipientId, userId)
          ),
          like(directMessages.content, `%${query}%`)
        ),
        with: {
          sender: {
            columns: {
              id: true,
              username: true,
              avatarStyle: true,
              avatarSeed: true,
            },
          },
          recipient: {
            columns: {
              id: true,
              username: true,
              avatarStyle: true,
              avatarSeed: true,
            },
          },
        },
        orderBy: desc(directMessages.createdAt),
        offset,
        limit,
      }),
      db.select({ count: drizzleCount() })
        .from(directMessages)
        .where(and(
          or(
            eq(directMessages.senderId, userId),
            eq(directMessages.recipientId, userId)
          ),
          like(directMessages.content, `%${query}%`)
        )),
    ]);

    const total = totalResult[0].count;

    return {
      data: messageList,
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
}

export default new DirectMessageService();
