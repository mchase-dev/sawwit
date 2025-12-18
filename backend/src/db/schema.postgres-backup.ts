import { pgTable, uuid, varchar, text, timestamp, boolean, integer, pgEnum, unique, index, doublePrecision } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// ENUMS
// ============================================================================

export const memberRoleEnum = pgEnum('MemberRole', ['MEMBER', 'MODERATOR']);
export const postTypeEnum = pgEnum('PostType', ['TEXT', 'LINK', 'IMAGE']);
export const notificationTypeEnum = pgEnum('NotificationType', [
  'COMMENT_ON_POST',
  'POST_IN_OWNED_TOPIC',
  'MODERATOR_ADDED',
  'MODERATOR_REMOVED',
  'BANNED_FROM_TOPIC',
  'USER_MENTIONED',
  'DIRECT_MESSAGE'
]);
export const notificationStatusEnum = pgEnum('NotificationStatus', ['UNREAD', 'READ', 'DELETED']);
export const reportTypeEnum = pgEnum('ReportType', ['POST', 'COMMENT']);
export const reportStatusEnum = pgEnum('ReportStatus', ['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED']);
export const modActionEnum = pgEnum('ModAction', [
  'DELETE_POST',
  'DELETE_COMMENT',
  'BAN_USER',
  'UNBAN_USER',
  'PIN_POST',
  'UNPIN_POST',
  'REMOVE_POST',
  'REMOVE_COMMENT',
  'AWARD_BADGE',
  'REMOVE_BADGE',
  'ADD_MODERATOR',
  'REMOVE_MODERATOR'
]);
export const modTargetTypeEnum = pgEnum('ModTargetType', ['POST', 'COMMENT', 'USER']);
export const automodActionEnum = pgEnum('AutomodAction', ['REMOVE', 'REPORT', 'FILTER', 'LOCK', 'MESSAGE', 'APPROVE']);

// ============================================================================
// CORE MODELS
// ============================================================================

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  bio: text('bio'),
  website: varchar('website', { length: 500 }),
  avatarStyle: varchar('avatar_style', { length: 50 }).default('bottts').notNull(),
  avatarSeed: varchar('avatar_seed', { length: 50 }).notNull(),
  isSuperuser: boolean('is_superuser').default(false).notNull(),
  postCred: integer('post_cred').default(0).notNull(),
  commentCred: integer('comment_cred').default(0).notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  agreedToTermsAt: timestamp('agreed_to_terms_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const topics = pgTable('topics', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  description: text('description').notNull(),
  rules: text('rules'),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  trendingScore: doublePrecision('trending_score').default(0).notNull(),
  lastActivityAt: timestamp('last_activity_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const topicMembers = pgTable('topic_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  topicId: uuid('topic_id').notNull().references(() => topics.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: memberRoleEnum('role').default('MEMBER').notNull(),
  isBanned: boolean('is_banned').default(false).notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (table) => ({
  uniqueTopicUser: unique().on(table.topicId, table.userId),
}));

export const posts = pgTable('posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  title: varchar('title', { length: 500 }).notNull(),
  content: text('content').notNull(),
  type: postTypeEnum('type').default('TEXT').notNull(),
  linkUrl: text('link_url'),
  imageUrl: text('image_url'),
  isNSFW: boolean('is_nsfw').default(false).notNull(),
  isSpoiler: boolean('is_spoiler').default(false).notNull(),
  isPinned: boolean('is_pinned').default(false).notNull(),
  isLocked: boolean('is_locked').default(false).notNull(),
  topicId: uuid('topic_id').notNull().references(() => topics.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').references(() => postTags.id),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const comments = pgTable('comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  content: text('content').notNull(),
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  parentId: uuid('parent_id'),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const votes = pgTable('votes', {
  id: uuid('id').defaultRandom().primaryKey(),
  value: integer('value').notNull(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  postId: uuid('post_id').references(() => posts.id, { onDelete: 'cascade' }),
  commentId: uuid('comment_id').references(() => comments.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueUserPost: unique().on(table.userId, table.postId),
  uniqueUserComment: unique().on(table.userId, table.commentId),
}));

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: notificationTypeEnum('type').notNull(),
  message: text('message').notNull(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  relatedId: uuid('related_id'),
  status: notificationStatusEnum('status').default('UNREAD').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// PHASE 2 FEATURE MODELS
// ============================================================================

export const postTags = pgTable('post_tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  topicId: uuid('topic_id').notNull().references(() => topics.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  textColor: varchar('text_color', { length: 7 }).default('#FFFFFF').notNull(),
  bgColor: varchar('bg_color', { length: 7 }).default('#0079D3').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  uniqueTopicName: unique().on(table.topicId, table.name),
}));

export const userBadges = pgTable('user_badges', {
  id: uuid('id').defaultRandom().primaryKey(),
  topicId: uuid('topic_id').notNull().references(() => topics.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  text: varchar('text', { length: 255 }).notNull(),
  textColor: varchar('text_color', { length: 7 }).default('#FFFFFF').notNull(),
  bgColor: varchar('bg_color', { length: 7 }).default('#0079D3').notNull(),
  awardedBy: uuid('awarded_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  uniqueTopicUser: unique().on(table.topicId, table.userId),
}));

export const reports = pgTable('reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: reportTypeEnum('type').notNull(),
  targetId: uuid('target_id').notNull(),
  reporterId: uuid('reporter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  reason: text('reason').notNull(),
  status: reportStatusEnum('status').default('PENDING').notNull(),
  resolvedBy: uuid('resolved_by').references(() => users.id),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const savedPosts = pgTable('saved_posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  savedAt: timestamp('saved_at').defaultNow().notNull(),
}, (table) => ({
  uniqueUserPost: unique().on(table.userId, table.postId),
}));

// ============================================================================
// PHASE 3 FEATURE MODELS
// ============================================================================

export const directMessages = pgTable('direct_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  senderId: uuid('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  recipientId: uuid('recipient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  subject: varchar('subject', { length: 500 }),
  content: text('content').notNull(),
  isRead: boolean('is_read').default(false).notNull(),
  parentId: uuid('parent_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  idxRecipientRead: index('idx_recipient_read').on(table.recipientId, table.isRead),
  idxSenderCreated: index('idx_sender_created').on(table.senderId, table.createdAt),
}));

export const userBlocks = pgTable('user_blocks', {
  id: uuid('id').defaultRandom().primaryKey(),
  blockerId: uuid('blocker_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  blockedId: uuid('blocked_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  uniqueBlock: unique().on(table.blockerId, table.blockedId),
}));

export const modLogs = pgTable('mod_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  topicId: uuid('topic_id').notNull().references(() => topics.id, { onDelete: 'cascade' }),
  moderatorId: uuid('moderator_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  action: modActionEnum('action').notNull(),
  targetType: modTargetTypeEnum('target_type').notNull(),
  targetId: uuid('target_id').notNull(),
  reason: text('reason'),
  details: text('details'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  idxTopicCreated: index('idx_topic_created').on(table.topicId, table.createdAt),
}));

export const automodRules = pgTable('automod_rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  topicId: uuid('topic_id').notNull().references(() => topics.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  enabled: boolean('enabled').default(true).notNull(),
  priority: integer('priority').default(0).notNull(),
  conditions: text('conditions').notNull(),
  action: automodActionEnum('action').notNull(),
  actionData: text('action_data'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  idxTopicEnabledPriority: index('idx_topic_enabled_priority').on(table.topicId, table.enabled, table.priority),
}));

export const userMentions = pgTable('user_mentions', {
  id: uuid('id').defaultRandom().primaryKey(),
  mentionerId: uuid('mentioner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  mentionedId: uuid('mentioned_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  postId: uuid('post_id').references(() => posts.id, { onDelete: 'cascade' }),
  commentId: uuid('comment_id').references(() => comments.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  idxMentionedCreated: index('idx_mentioned_created').on(table.mentionedId, table.createdAt),
}));

// ============================================================================
// RELATIONS
// ============================================================================

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
