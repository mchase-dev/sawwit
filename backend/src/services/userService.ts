import { db } from '../db';
import { users, posts, comments } from '../db/schema';
import { eq, and, desc, count as drizzleCount } from 'drizzle-orm';
import { hashPassword, comparePassword, validatePasswordStrength } from '../utils/password';
import { generateAvatarSeed } from '../utils/random';
import { AppError } from '../middleware/errorHandler';
import { PaginationParams, UserProfile } from '../types';

class UserService {
  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<UserProfile> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        website: true,
        avatarStyle: true,
        avatarSeed: true,
        postCred: true,
        commentCred: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    return {
      ...user,
      displayName: user.displayName ?? undefined,
      bio: user.bio ?? undefined,
      website: user.website ?? undefined,
    };
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<UserProfile> {
    const user = await db.query.users.findFirst({
      where: eq(users.username, username),
      columns: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        website: true,
        avatarStyle: true,
        avatarSeed: true,
        postCred: true,
        commentCred: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    return {
      ...user,
      displayName: user.displayName ?? undefined,
      bio: user.bio ?? undefined,
      website: user.website ?? undefined,
    };
  }

  /**
   * Get user by email (admin only)
   */
  async getUserByEmail(email: string): Promise<any> {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    return user;
  }

  /**
   * Update user profile
   */
  async updateUser(
    userId: string,
    data: {
      displayName?: string;
      bio?: string;
      website?: string;
    }
  ): Promise<any> {
    const [updatedUser] = await db.update(users)
      .set(data)
      .where(eq(users.id, userId))
      .returning();

    // Select only needed fields
    return {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      displayName: updatedUser.displayName,
      bio: updatedUser.bio,
      website: updatedUser.website,
      avatarStyle: updatedUser.avatarStyle,
      avatarSeed: updatedUser.avatarSeed,
      postCred: updatedUser.postCred,
      commentCred: updatedUser.commentCred,
      emailVerified: updatedUser.emailVerified,
      createdAt: updatedUser.createdAt,
    };
  }

  /**
   * Update password
   */
  async updatePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    // Get user with password hash
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || !user.passwordHash) {
      throw new AppError(404, 'User not found');
    }

    // Verify old password
    const isPasswordValid = await comparePassword(oldPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError(401, 'Current password is incorrect');
    }

    // Validate new password
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new AppError(400, passwordValidation.errors.join(', '));
    }

    // Hash and update password
    const passwordHash = await hashPassword(newPassword);
    await db.update(users)
      .set({ passwordHash })
      .where(eq(users.id, userId));
  }

  /**
   * Update avatar
   */
  async updateAvatar(
    userId: string,
    avatarStyle: string,
    avatarSeed?: string
  ): Promise<any> {
    const [updatedUser] = await db.update(users)
      .set({
        avatarStyle,
        avatarSeed: avatarSeed || generateAvatarSeed(),
      })
      .where(eq(users.id, userId))
      .returning();

    return {
      id: updatedUser.id,
      username: updatedUser.username,
      avatarStyle: updatedUser.avatarStyle,
      avatarSeed: updatedUser.avatarSeed,
    };
  }

  /**
   * Get user's posts
   */
  async getUserPosts(
    username: string,
    { page = 1, limit = 20 }: PaginationParams
  ): Promise<any> {
    const user = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    const offset = (page - 1) * limit;

    const [postList, totalResult] = await Promise.all([
      db.query.posts.findMany({
        where: and(
          eq(posts.authorId, user.id),
          eq(posts.isDeleted, false)
        ),
        with: {
          author: {
            columns: {
              username: true,
              avatarStyle: true,
              avatarSeed: true,
            },
          },
          topic: {
            columns: {
              name: true,
              displayName: true,
            },
          },
        },
        orderBy: desc(posts.createdAt),
        offset,
        limit,
      }),
      db.select({ count: drizzleCount() })
        .from(posts)
        .where(and(
          eq(posts.authorId, user.id),
          eq(posts.isDeleted, false)
        )),
    ]);

    const total = totalResult[0].count;

    // Note: _count for comments and votes not yet implemented
    // This will require additional queries or SQL aggregation
    return {
      data: postList,
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
   * Get user's comments
   */
  async getUserComments(
    username: string,
    { page = 1, limit = 20 }: PaginationParams
  ): Promise<any> {
    const user = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    const offset = (page - 1) * limit;

    const [commentList, totalResult] = await Promise.all([
      db.query.comments.findMany({
        where: and(
          eq(comments.authorId, user.id),
          eq(comments.isDeleted, false)
        ),
        with: {
          author: {
            columns: {
              username: true,
              avatarStyle: true,
              avatarSeed: true,
            },
          },
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
                },
              },
            },
          },
        },
        orderBy: desc(comments.createdAt),
        offset,
        limit,
      }),
      db.select({ count: drizzleCount() })
        .from(comments)
        .where(and(
          eq(comments.authorId, user.id),
          eq(comments.isDeleted, false)
        )),
    ]);

    const total = totalResult[0].count;

    // Note: _count for votes and replies not yet implemented
    // This will require additional queries or SQL aggregation
    return {
      data: commentList,
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
   * Delete user account
   */
  async deleteAccount(
    userId: string,
    password: string,
    confirmText: string
  ): Promise<void> {
    // Verify confirmation text
    if (confirmText !== 'DELETE MY ACCOUNT') {
      throw new AppError(400, 'Confirmation text does not match');
    }

    // Get user with password
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        ownedTopics: true,
      },
    });

    if (!user || !user.passwordHash) {
      throw new AppError(404, 'User not found');
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError(401, 'Password is incorrect');
    }

    // Handle owned topics
    if (user.ownedTopics.length > 0) {
      // Option 1: Delete topics with no other members
      // Option 2: Transfer ownership to a moderator
      // For now, we'll just prevent deletion if user owns topics
      throw new AppError(
        400,
        'You must transfer or delete your topics before deleting your account'
      );
    }

    // Delete user (cascade will handle related records)
    await db.delete(users)
      .where(eq(users.id, userId));

    // Note: In production, also invalidate all user sessions/tokens
  }

  /**
   * Verify email
   */
  async verifyEmail(userId: string): Promise<void> {
    await db.update(users)
      .set({ emailVerified: true })
      .where(eq(users.id, userId));
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(userId: string): Promise<void> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    if (user.emailVerified) {
      throw new AppError(400, 'Email already verified');
    }

    // TODO: Generate verification token and send email
    // This will be implemented when we add email service
    throw new AppError(501, 'Email verification not yet implemented');
  }
}

export default new UserService();
