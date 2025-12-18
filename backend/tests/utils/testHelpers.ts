import { getTestDb } from './testDb';
import { topics, posts, comments, topicMembers, votes } from '../setup/schema.sqlite';
import { randomUUID } from 'crypto';

/**
 * Generate a unique email for testing
 */
export const generateUniqueEmail = (): string => {
  return `test${Date.now()}@example.com`;
};

/**
 * Generate a unique username for testing
 */
export const generateUniqueUsername = (): string => {
  return `user${Date.now()}`;
};

/**
 * Create a test topic
 */
export const createTestTopic = async (
  ownerId: string,
  name?: string,
  displayName?: string
) => {
  const db = getTestDb();
  const topicName = name || `topic${Date.now()}`;
  const now = new Date();

  const [topic] = await db.insert(topics).values({
    id: randomUUID(),
    name: topicName,
    displayName: displayName || `Test Topic ${topicName}`,
    description: 'Test topic description',
    ownerId,
    trendingScore: 0,
    lastActivityAt: now,
    createdAt: now,
    updatedAt: now,
  }).returning();

  return topic;
};

/**
 * Create a test post
 */
export const createTestPost = async (
  authorId: string,
  topicId: string,
  type: 'TEXT' | 'LINK' | 'IMAGE' = 'TEXT'
) => {
  const db = getTestDb();
  const slug = `post-${Date.now()}`;
  const now = new Date();

  const [post] = await db.insert(posts).values({
    id: randomUUID(),
    slug,
    title: 'Test Post Title',
    content: type === 'TEXT' ? 'Test post content' : '',
    linkUrl: type === 'LINK' ? 'https://example.com' : null,
    imageUrl: type === 'IMAGE' ? 'https://example.com/image.jpg' : null,
    type,
    authorId,
    topicId,
    isNsfw: 0,
    isSpoiler: 0,
    isPinned: 0,
    isLocked: 0,
    isDeleted: 0,
    createdAt: now,
    updatedAt: now,
  }).returning();

  return post;
};

/**
 * Create a test comment
 */
export const createTestComment = async (
  authorId: string,
  postId: string,
  content?: string,
  parentId?: string
) => {
  const db = getTestDb();
  const now = new Date();

  const [comment] = await db.insert(comments).values({
    id: randomUUID(),
    content: content || 'Test comment content',
    authorId,
    postId,
    parentId: parentId || null,
    isDeleted: 0,
    createdAt: now,
    updatedAt: now,
  }).returning();

  return comment;
};

/**
 * Add user as topic member
 */
export const addTopicMember = async (
  userId: string,
  topicId: string,
  role: 'MEMBER' | 'MODERATOR' = 'MEMBER'
) => {
  const db = getTestDb();
  const now = new Date();

  const [member] = await db.insert(topicMembers).values({
    id: randomUUID(),
    userId,
    topicId,
    role,
    isBanned: 0,
    joinedAt: now,
  }).returning();

  return member;
};

/**
 * Create a test vote
 */
export const createTestVote = async (
  userId: string,
  targetId: string,
  targetType: 'POST' | 'COMMENT',
  value: 1 | -1 = 1
) => {
  const db = getTestDb();
  const now = new Date();

  const [vote] = await db.insert(votes).values({
    id: randomUUID(),
    userId,
    value,
    postId: targetType === 'POST' ? targetId : null,
    commentId: targetType === 'COMMENT' ? targetId : null,
    createdAt: now,
  }).returning();

  return vote;
};

export default {
  generateUniqueEmail,
  generateUniqueUsername,
  createTestTopic,
  createTestPost,
  createTestComment,
  addTopicMember,
  createTestVote,
};
