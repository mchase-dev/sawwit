/**
 * Simplified SQLite schema for unit tests
 * Mirrors the PostgreSQL production schema but uses SQLite-compatible types
 */

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// ENUM VALUES (stored as text in SQLite)
// ============================================================================

export const MemberRole = {
  MEMBER: 'MEMBER',
  MODERATOR: 'MODERATOR',
} as const;

export const PostType = {
  TEXT: 'TEXT',
  LINK: 'LINK',
  IMAGE: 'IMAGE',
} as const;

export const NotificationType = {
  COMMENT_ON_POST: 'COMMENT_ON_POST',
  POST_IN_OWNED_TOPIC: 'POST_IN_OWNED_TOPIC',
  MODERATOR_ADDED: 'MODERATOR_ADDED',
  MODERATOR_REMOVED: 'MODERATOR_REMOVED',
  BANNED_FROM_TOPIC: 'BANNED_FROM_TOPIC',
  USER_MENTIONED: 'USER_MENTIONED',
  DIRECT_MESSAGE: 'DIRECT_MESSAGE',
} as const;

export const NotificationStatus = {
  UNREAD: 'UNREAD',
  READ: 'READ',
  DELETED: 'DELETED',
} as const;

export const ReportType = {
  POST: 'POST',
  COMMENT: 'COMMENT',
} as const;

export const ReportStatus = {
  PENDING: 'PENDING',
  REVIEWED: 'REVIEWED',
  RESOLVED: 'RESOLVED',
  DISMISSED: 'DISMISSED',
} as const;

export const ModAction = {
  DELETE_POST: 'DELETE_POST',
  DELETE_COMMENT: 'DELETE_COMMENT',
  BAN_USER: 'BAN_USER',
  UNBAN_USER: 'UNBAN_USER',
  PIN_POST: 'PIN_POST',
  UNPIN_POST: 'UNPIN_POST',
  REMOVE_POST: 'REMOVE_POST',
  REMOVE_COMMENT: 'REMOVE_COMMENT',
  AWARD_BADGE: 'AWARD_BADGE',
  REMOVE_BADGE: 'REMOVE_BADGE',
  ADD_MODERATOR: 'ADD_MODERATOR',
  REMOVE_MODERATOR: 'REMOVE_MODERATOR',
} as const;

export const ModTargetType = {
  POST: 'POST',
  COMMENT: 'COMMENT',
  USER: 'USER',
} as const;

export const AutomodAction = {
  REMOVE: 'REMOVE',
  REPORT: 'REPORT',
  FILTER: 'FILTER',
  LOCK: 'LOCK',
  MESSAGE: 'MESSAGE',
  APPROVE: 'APPROVE',
} as const;

// ============================================================================
// TABLES
// ============================================================================

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  bio: text('bio'),
  website: text('website'),
  avatarStyle: text('avatar_style').notNull().default('bottts'),
  avatarSeed: text('avatar_seed').notNull(),
  isSuperuser: integer('is_superuser', { mode: 'boolean' }).notNull().default(false),
  postCred: integer('post_cred').notNull().default(0),
  commentCred: integer('comment_cred').notNull().default(0),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  agreedToTermsAt: integer('agreed_to_terms_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const topics = sqliteTable('topics', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  displayName: text('display_name').notNull(),
  description: text('description').notNull(),
  rules: text('rules'),
  ownerId: text('owner_id').notNull().references(() => users.id),
  trendingScore: integer('trending_score').notNull().default(0),
  lastActivityAt: integer('last_activity_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const topicMembers = sqliteTable('topic_members', {
  id: text('id').primaryKey(),
  topicId: text('topic_id').notNull().references(() => topics.id),
  userId: text('user_id').notNull().references(() => users.id),
  role: text('role').notNull().default('MEMBER'),
  isBanned: integer('is_banned', { mode: 'boolean' }).notNull().default(false),
  joinedAt: integer('joined_at', { mode: 'timestamp' }).notNull(),
});

export const posts = sqliteTable('posts', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  type: text('type').notNull().default('TEXT'),
  linkUrl: text('link_url'),
  imageUrl: text('image_url'),
  isNSFW: integer('is_nsfw', { mode: 'boolean' }).notNull().default(false),
  isSpoiler: integer('is_spoiler', { mode: 'boolean' }).notNull().default(false),
  isPinned: integer('is_pinned', { mode: 'boolean' }).notNull().default(false),
  isLocked: integer('is_locked', { mode: 'boolean' }).notNull().default(false),
  topicId: text('topic_id').notNull().references(() => topics.id),
  authorId: text('author_id').notNull().references(() => users.id),
  tagId: text('tag_id').references(() => postTags.id),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const comments = sqliteTable('comments', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),
  postId: text('post_id').notNull().references(() => posts.id),
  authorId: text('author_id').notNull().references(() => users.id),
  parentId: text('parent_id'),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const votes = sqliteTable('votes', {
  id: text('id').primaryKey(),
  value: integer('value').notNull(),
  userId: text('user_id').notNull().references(() => users.id),
  postId: text('post_id').references(() => posts.id),
  commentId: text('comment_id').references(() => comments.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  message: text('message').notNull(),
  userId: text('user_id').notNull().references(() => users.id),
  relatedId: text('related_id'),
  status: text('status').notNull().default('UNREAD'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const postTags = sqliteTable('post_tags', {
  id: text('id').primaryKey(),
  topicId: text('topic_id').notNull().references(() => topics.id),
  name: text('name').notNull(),
  textColor: text('text_color').notNull().default('#FFFFFF'),
  bgColor: text('bg_color').notNull().default('#0079D3'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const userBadges = sqliteTable('user_badges', {
  id: text('id').primaryKey(),
  topicId: text('topic_id').notNull().references(() => topics.id),
  userId: text('user_id').notNull().references(() => users.id),
  text: text('text').notNull(),
  textColor: text('text_color').notNull().default('#FFFFFF'),
  bgColor: text('bg_color').notNull().default('#0079D3'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  awardedBy: text('awarded_by'),
});

export const reports = sqliteTable('reports', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  targetId: text('target_id').notNull(),
  reporterId: text('reporter_id').notNull().references(() => users.id),
  reason: text('reason').notNull(),
  status: text('status').notNull().default('PENDING'),
  resolvedBy: text('resolved_by').references(() => users.id),
  resolvedAt: integer('resolved_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const savedPosts = sqliteTable('saved_posts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  postId: text('post_id').notNull().references(() => posts.id),
  savedAt: integer('saved_at', { mode: 'timestamp' }).notNull(),
});

export const directMessages = sqliteTable('direct_messages', {
  id: text('id').primaryKey(),
  senderId: text('sender_id').notNull().references(() => users.id),
  recipientId: text('recipient_id').notNull().references(() => users.id),
  subject: text('subject'),
  content: text('content').notNull(),
  isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
  parentId: text('parent_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const userBlocks = sqliteTable('user_blocks', {
  id: text('id').primaryKey(),
  blockerId: text('blocker_id').notNull().references(() => users.id),
  blockedId: text('blocked_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const modLogs = sqliteTable('mod_logs', {
  id: text('id').primaryKey(),
  topicId: text('topic_id').notNull().references(() => topics.id),
  moderatorId: text('moderator_id').notNull().references(() => users.id),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  reason: text('reason'),
  details: text('details'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const automodRules = sqliteTable('automod_rules', {
  id: text('id').primaryKey(),
  topicId: text('topic_id').notNull().references(() => topics.id),
  name: text('name').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  priority: integer('priority').notNull().default(0),
  conditions: text('conditions').notNull(),
  action: text('action').notNull(),
  actionData: text('action_data'),
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const userMentions = sqliteTable('user_mentions', {
  id: text('id').primaryKey(),
  mentionerId: text('mentioner_id').notNull().references(() => users.id),
  mentionedId: text('mentioned_id').notNull().references(() => users.id),
  postId: text('post_id').references(() => posts.id),
  commentId: text('comment_id').references(() => comments.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Relations would be defined here if needed for tests
export const usersRelations = relations(users, ({ many }) => ({
  ownedTopics: many(topics),
  memberships: many(topicMembers),
  posts: many(posts),
  comments: many(comments),
  votes: many(votes),
  notifications: many(notifications),
  badges: many(userBadges),
  reportsMade: many(reports),
  savedPosts: many(savedPosts),
  sentMessages: many(directMessages, { relationName: 'sentMessages' }),
  receivedMessages: many(directMessages, { relationName: 'receivedMessages' }),
  blockedUsers: many(userBlocks, { relationName: 'blocker' }),
  blockedBy: many(userBlocks, { relationName: 'blocked' }),
  modLogs: many(modLogs),
  automodRules: many(automodRules),
  mentionsMade: many(userMentions, { relationName: 'mentioner' }),
  mentionsReceived: many(userMentions, { relationName: 'mentioned' }),
}));

export const topicsRelations = relations(topics, ({ one, many }) => ({
  owner: one(users, {
    fields: [topics.ownerId],
    references: [users.id],
  }),
  members: many(topicMembers),
  posts: many(posts),
  postTags: many(postTags),
  userBadges: many(userBadges),
  modLogs: many(modLogs),
  automodRules: many(automodRules),
}));

export const topicMembersRelations = relations(topicMembers, ({ one }) => ({
  topic: one(topics, {
    fields: [topicMembers.topicId],
    references: [topics.id],
  }),
  user: one(users, {
    fields: [topicMembers.userId],
    references: [users.id],
  }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  topic: one(topics, {
    fields: [posts.topicId],
    references: [topics.id],
  }),
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  tag: one(postTags, {
    fields: [posts.tagId],
    references: [postTags.id],
  }),
  comments: many(comments),
  votes: many(votes),
  savedBy: many(savedPosts),
  mentions: many(userMentions),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: 'commentReplies',
  }),
  replies: many(comments, { relationName: 'commentReplies' }),
  votes: many(votes),
  mentions: many(userMentions),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  user: one(users, {
    fields: [votes.userId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [votes.postId],
    references: [posts.id],
  }),
  comment: one(comments, {
    fields: [votes.commentId],
    references: [comments.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const postTagsRelations = relations(postTags, ({ one, many }) => ({
  topic: one(topics, {
    fields: [postTags.topicId],
    references: [topics.id],
  }),
  posts: many(posts),
}));

export const userBadgesRelations = relations(userBadges, ({ one }) => ({
  topic: one(topics, {
    fields: [userBadges.topicId],
    references: [topics.id],
  }),
  user: one(users, {
    fields: [userBadges.userId],
    references: [users.id],
  }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  reporter: one(users, {
    fields: [reports.reporterId],
    references: [users.id],
  }),
  resolver: one(users, {
    fields: [reports.resolvedBy],
    references: [users.id],
  }),
}));

export const savedPostsRelations = relations(savedPosts, ({ one }) => ({
  user: one(users, {
    fields: [savedPosts.userId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [savedPosts.postId],
    references: [posts.id],
  }),
}));

export const directMessagesRelations = relations(directMessages, ({ one, many }) => ({
  sender: one(users, {
    fields: [directMessages.senderId],
    references: [users.id],
    relationName: 'sentMessages',
  }),
  recipient: one(users, {
    fields: [directMessages.recipientId],
    references: [users.id],
    relationName: 'receivedMessages',
  }),
  parent: one(directMessages, {
    fields: [directMessages.parentId],
    references: [directMessages.id],
    relationName: 'messageThread',
  }),
  replies: many(directMessages, { relationName: 'messageThread' }),
}));

export const userBlocksRelations = relations(userBlocks, ({ one }) => ({
  blocker: one(users, {
    fields: [userBlocks.blockerId],
    references: [users.id],
    relationName: 'blocker',
  }),
  blocked: one(users, {
    fields: [userBlocks.blockedId],
    references: [users.id],
    relationName: 'blocked',
  }),
}));

export const modLogsRelations = relations(modLogs, ({ one }) => ({
  topic: one(topics, {
    fields: [modLogs.topicId],
    references: [topics.id],
  }),
  moderator: one(users, {
    fields: [modLogs.moderatorId],
    references: [users.id],
  }),
}));

export const automodRulesRelations = relations(automodRules, ({ one }) => ({
  topic: one(topics, {
    fields: [automodRules.topicId],
    references: [topics.id],
  }),
  creator: one(users, {
    fields: [automodRules.createdBy],
    references: [users.id],
  }),
}));

export const userMentionsRelations = relations(userMentions, ({ one }) => ({
  mentioner: one(users, {
    fields: [userMentions.mentionerId],
    references: [users.id],
    relationName: 'mentioner',
  }),
  mentioned: one(users, {
    fields: [userMentions.mentionedId],
    references: [users.id],
    relationName: 'mentioned',
  }),
  post: one(posts, {
    fields: [userMentions.postId],
    references: [posts.id],
  }),
  comment: one(comments, {
    fields: [userMentions.commentId],
    references: [comments.id],
  }),
}));
