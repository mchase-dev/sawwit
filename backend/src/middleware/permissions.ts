import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { topics, topicMembers } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { AppError } from './errorHandler';

/**
 * Check if user is a member of a topic
 */
export async function isMember(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const topicName = req.params.topicName || req.params.name;
    if (!topicName) {
      throw new AppError(400, 'Topic name not provided');
    }

    // Get topic
    const topic = await db.query.topics.findFirst({
      where: eq(topics.name, topicName),
    });

    if (!topic) {
      throw new AppError(404, 'Topic not found');
    }

    // Check membership
    const membership = await db.query.topicMembers.findFirst({
      where: and(
        eq(topicMembers.topicId, topic.id),
        eq(topicMembers.userId, req.user.userId)
      ),
    });

    if (!membership) {
      throw new AppError(403, 'You must be a member of this topic');
    }

    if (membership.isBanned) {
      throw new AppError(403, 'You are banned from this topic');
    }

    // Attach topic and membership to request
    (req as any).topic = topic;
    (req as any).membership = membership;

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Check if user is a moderator or owner of a topic
 */
export async function isModerator(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const topicName = req.params.topicName || req.params.name;
    if (!topicName) {
      throw new AppError(400, 'Topic name not provided');
    }

    // Get topic
    const topic = await db.query.topics.findFirst({
      where: eq(topics.name, topicName),
    });

    if (!topic) {
      throw new AppError(404, 'Topic not found');
    }

    // Get membership
    const membership = await db.query.topicMembers.findFirst({
      where: and(
        eq(topicMembers.topicId, topic.id),
        eq(topicMembers.userId, req.user.userId)
      ),
    });

    // Check if owner
    if (topic.ownerId === req.user.userId) {
      (req as any).topic = topic;
      (req as any).membership = membership;
      (req as any).isOwner = true;
      return next();
    }

    // Check if moderator
    if (!membership || membership.role !== 'MODERATOR') {
      throw new AppError(403, 'Moderator access required');
    }

    if (membership.isBanned) {
      throw new AppError(403, 'You are banned from this topic');
    }

    (req as any).topic = topic;
    (req as any).membership = membership;
    (req as any).isOwner = false;

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Check if user is the owner of a topic
 */
export async function isOwner(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const topicName = req.params.topicName || req.params.name;
    if (!topicName) {
      throw new AppError(400, 'Topic name not provided');
    }

    // Get topic
    const topic = await db.query.topics.findFirst({
      where: eq(topics.name, topicName),
    });

    if (!topic) {
      throw new AppError(404, 'Topic not found');
    }

    if (topic.ownerId !== req.user.userId) {
      throw new AppError(403, 'Owner access required');
    }

    (req as any).topic = topic;
    (req as any).isOwner = true;

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Check if user is moderator, owner, or superuser
 */
export async function isModeratorOrSuperuser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    // Superuser has access to everything
    if (req.user.isSuperuser) {
      return next();
    }

    // Otherwise, check moderator permissions
    return isModerator(req, res, next);
  } catch (error) {
    next(error);
  }
}

/**
 * Check if user can modify a resource (is author, moderator, or superuser)
 */
export function canModifyResource(
  userId: string,
  authorId: string,
  isSuperuser: boolean,
  isModerator: boolean
): boolean {
  return userId === authorId || isModerator || isSuperuser;
}
