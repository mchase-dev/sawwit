import { db } from '../db';
import { users, userMentions } from '../db/schema';
import { eq, inArray, desc, count as drizzleCount } from 'drizzle-orm';
import notificationService from './notificationService';

class MentionService {
  private readonly MAX_MENTIONS = 5;

  /**
   * Extract mentions from content
   * Matches @username pattern
   */
  extractMentions(content: string): string[] {
    // Match @username (alphanumeric + underscore, 3-20 chars)
    const mentionRegex = /@(\w{3,20})/g;
    const matches = content.matchAll(mentionRegex);

    const mentions = new Set<string>();
    for (const match of matches) {
      mentions.add(match[1].toLowerCase());
    }

    return Array.from(mentions);
  }

  /**
   * Validate and resolve usernames to user IDs
   */
  async resolveMentions(usernames: string[]): Promise<Map<string, string>> {
    if (usernames.length === 0) {
      return new Map();
    }

    // Get users by username
    const lowerUsernames = usernames.map(u => u.toLowerCase());

    const userList = await db.query.users.findMany({
      where: inArray(users.username, lowerUsernames),
      columns: {
        id: true,
        username: true,
      },
    });

    // Map username to userId
    const usernameToId = new Map<string, string>();
    userList.forEach((user) => {
      usernameToId.set(user.username.toLowerCase(), user.id);
    });

    return usernameToId;
  }

  /**
   * Process mentions in a post
   */
  async processMentionsInPost(
    postId: string,
    content: string,
    authorId: string
  ): Promise<{
    mentionedUsers: string[];
    invalidMentions: string[];
  }> {
    // Extract mentions
    const usernames = this.extractMentions(content);

    if (usernames.length === 0) {
      return { mentionedUsers: [], invalidMentions: [] };
    }

    // Limit to MAX_MENTIONS
    const limitedUsernames = usernames.slice(0, this.MAX_MENTIONS);
    const invalidMentions = usernames.slice(this.MAX_MENTIONS);

    // Resolve usernames to IDs
    const usernameToId = await this.resolveMentions(limitedUsernames);

    const mentionedUsers: string[] = [];

    // Create mention records and send notifications
    for (const username of limitedUsernames) {
      const userId = usernameToId.get(username.toLowerCase());

      if (userId) {
        // Create mention record
        await db.insert(userMentions).values({
          mentionedId: userId,
          postId,
          mentionerId: authorId,
        });

        // Send notification
        await notificationService.notifyMention(userId, authorId, postId);

        mentionedUsers.push(userId);
      } else {
        invalidMentions.push(username);
      }
    }

    return {
      mentionedUsers,
      invalidMentions,
    };
  }

  /**
   * Process mentions in a comment
   */
  async processMentionsInComment(
    commentId: string,
    postId: string,
    content: string,
    authorId: string
  ): Promise<{
    mentionedUsers: string[];
    invalidMentions: string[];
  }> {
    // Extract mentions
    const usernames = this.extractMentions(content);

    if (usernames.length === 0) {
      return { mentionedUsers: [], invalidMentions: [] };
    }

    // Limit to MAX_MENTIONS
    const limitedUsernames = usernames.slice(0, this.MAX_MENTIONS);
    const invalidMentions = usernames.slice(this.MAX_MENTIONS);

    // Resolve usernames to IDs
    const usernameToId = await this.resolveMentions(limitedUsernames);

    const mentionedUsers: string[] = [];

    // Create mention records and send notifications
    for (const username of limitedUsernames) {
      const userId = usernameToId.get(username.toLowerCase());

      if (userId) {
        // Create mention record
        await db.insert(userMentions).values({
          mentionedId: userId,
          postId,
          commentId: commentId || null,
          mentionerId: authorId,
        });

        // Send notification
        await notificationService.notifyMention(userId, authorId, commentId);

        mentionedUsers.push(userId);
      } else {
        invalidMentions.push(username);
      }
    }

    return {
      mentionedUsers,
      invalidMentions,
    };
  }

  /**
   * Get mentions for a user
   */
  async getUserMentions(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<any> {
    const offset = (page - 1) * limit;

    const [mentions, totalResult] = await Promise.all([
      db.query.userMentions.findMany({
        where: eq(userMentions.mentionedId, userId),
        with: {
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
                  displayName: true,
                },
              },
            },
          },
          comment: {
            columns: {
              id: true,
              content: true,
            },
          },
          mentioner: {
            columns: {
              id: true,
              username: true,
              avatarStyle: true,
              avatarSeed: true,
            },
          },
        },
        orderBy: desc(userMentions.createdAt),
        offset,
        limit,
      }),
      db.select({ count: drizzleCount() })
        .from(userMentions)
        .where(eq(userMentions.mentionedId, userId)),
    ]);

    const total = totalResult[0].count;

    return {
      data: mentions,
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
   * Get mentions in a specific post
   */
  async getPostMentions(postId: string): Promise<any[]> {
    const mentions = await db.query.userMentions.findMany({
      where: eq(userMentions.postId, postId),
      with: {
        mentioned: {
          columns: {
            id: true,
            username: true,
            avatarStyle: true,
            avatarSeed: true,
          },
        },
        comment: {
          columns: {
            id: true,
            content: true,
          },
        },
        mentioner: {
          columns: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: desc(userMentions.createdAt),
    });

    return mentions;
  }

  /**
   * Get mentions in a specific comment
   */
  async getCommentMentions(commentId: string): Promise<any[]> {
    const mentions = await db.query.userMentions.findMany({
      where: eq(userMentions.commentId, commentId),
      with: {
        mentioned: {
          columns: {
            id: true,
            username: true,
            avatarStyle: true,
            avatarSeed: true,
          },
        },
        mentioner: {
          columns: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: desc(userMentions.createdAt),
    });

    return mentions;
  }

  /**
   * Delete mentions when content is deleted
   */
  async deleteMentionsForPost(postId: string): Promise<void> {
    await db.delete(userMentions)
      .where(eq(userMentions.postId, postId));
  }

  /**
   * Delete mentions when comment is deleted
   */
  async deleteMentionsForComment(commentId: string): Promise<void> {
    await db.delete(userMentions)
      .where(eq(userMentions.commentId, commentId));
  }

  /**
   * Get mention count for a user
   */
  async getMentionCount(userId: string): Promise<number> {
    const result = await db.select({ count: drizzleCount() })
      .from(userMentions)
      .where(eq(userMentions.mentionedId, userId));
    return result[0].count;
  }

  /**
   * Get users who mention a specific user most often
   */
  async getTopMentioners(
    userId: string,
    limit: number = 10
  ): Promise<Array<{ user: any; count: number }>> {
    const mentions = await db.query.userMentions.findMany({
      where: eq(userMentions.mentionedId, userId),
      columns: {
        mentionerId: true,
      },
      with: {
        mentioner: {
          columns: {
            id: true,
            username: true,
            avatarStyle: true,
            avatarSeed: true,
          },
        },
      },
    });

    // Count mentions by user
    const countMap = new Map<string, { user: any; count: number }>();
    mentions.forEach((mention) => {
      const existing = countMap.get(mention.mentionerId);
      if (existing) {
        existing.count++;
      } else {
        countMap.set(mention.mentionerId, {
          user: mention.mentioner,
          count: 1,
        });
      }
    });

    // Sort by count and return top N
    return Array.from(countMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get users mentioned most often by a specific user
   */
  async getTopMentioned(
    userId: string,
    limit: number = 10
  ): Promise<Array<{ user: any; count: number }>> {
    const mentions = await db.query.userMentions.findMany({
      where: eq(userMentions.mentionerId, userId),
      columns: {
        mentionedId: true,
      },
      with: {
        mentioned: {
          columns: {
            id: true,
            username: true,
            avatarStyle: true,
            avatarSeed: true,
          },
        },
      },
    });

    // Count mentions by user
    const countMap = new Map<string, { user: any; count: number }>();
    mentions.forEach((mention) => {
      const existing = countMap.get(mention.mentionedId);
      if (existing) {
        existing.count++;
      } else {
        countMap.set(mention.mentionedId, {
          user: mention.mentioned,
          count: 1,
        });
      }
    });

    // Sort by count and return top N
    return Array.from(countMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Check if content has valid mention syntax
   */
  hasValidMentions(content: string): boolean {
    const mentions = this.extractMentions(content);
    return mentions.length > 0 && mentions.length <= this.MAX_MENTIONS;
  }

  /**
   * Replace mentions with clickable links (for rendering)
   */
  highlightMentions(content: string): string {
    return content.replace(
      /@(\w{3,20})/g,
      '<a href="/u/$1" class="mention">@$1</a>'
    );
  }
}

export default new MentionService();
