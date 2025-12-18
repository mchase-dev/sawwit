import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '../setup/schema.sqlite';
import * as fs from 'fs';
import * as path from 'path';

// Flag to track if database has been initialized
let isInitialized = false;
let sqlite: Database.Database;
let db: BetterSQLite3Database<typeof schema>;

/**
 * Initialize the test database (SQLite file for integration tests)
 */
export const initializeDatabase = async () => {
  if (isInitialized) return;

  try {
    const dbPath = path.join(process.cwd(), 'test.db');

    // Delete existing test database if it exists
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }

    // Create SQLite database
    sqlite = new Database(dbPath);
    db = drizzle(sqlite, { schema });

    // Initialize schema
    initializeTables();

    isInitialized = true;
    console.log('✓ Test database initialized (Drizzle + SQLite)');
  } catch (error) {
    console.error('Failed to initialize test database:', error);
    throw error;
  }
};

/**
 * Create SQLite tables
 */
function initializeTables() {
  // Users table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      first_name TEXT,
      last_name TEXT,
      bio TEXT,
      website TEXT,
      avatar_style TEXT NOT NULL DEFAULT 'bottts',
      avatar_seed TEXT NOT NULL,
      is_superuser INTEGER NOT NULL DEFAULT 0,
      post_cred INTEGER NOT NULL DEFAULT 0,
      comment_cred INTEGER NOT NULL DEFAULT 0,
      email_verified INTEGER NOT NULL DEFAULT 0,
      agreed_to_terms_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // Topics table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      description TEXT NOT NULL,
      rules TEXT,
      owner_id TEXT NOT NULL REFERENCES users(id),
      trending_score INTEGER NOT NULL DEFAULT 0,
      last_activity_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // Topic members table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS topic_members (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'MEMBER',
      is_banned INTEGER NOT NULL DEFAULT 0,
      joined_at INTEGER NOT NULL,
      UNIQUE(topic_id, user_id)
    );
  `);

  // Posts table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'TEXT',
      link_url TEXT,
      image_url TEXT,
      is_nsfw INTEGER NOT NULL DEFAULT 0,
      is_spoiler INTEGER NOT NULL DEFAULT 0,
      is_pinned INTEGER NOT NULL DEFAULT 0,
      is_locked INTEGER NOT NULL DEFAULT 0,
      topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tag_id TEXT REFERENCES post_tags(id),
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // Comments table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      parent_id TEXT,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // Votes table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY,
      value INTEGER NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      post_id TEXT REFERENCES posts(id) ON DELETE CASCADE,
      comment_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(user_id, post_id),
      UNIQUE(user_id, comment_id)
    );
  `);

  // Notifications table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      related_id TEXT,
      status TEXT NOT NULL DEFAULT 'UNREAD',
      created_at INTEGER NOT NULL
    );
  `);

  // Post tags table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS post_tags (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      text_color TEXT NOT NULL DEFAULT '#FFFFFF',
      bg_color TEXT NOT NULL DEFAULT '#0079D3',
      created_at INTEGER NOT NULL,
      UNIQUE(topic_id, name)
    );
  `);

  // User badges table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS user_badges (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      text_color TEXT NOT NULL DEFAULT '#FFFFFF',
      bg_color TEXT NOT NULL DEFAULT '#0079D3',
      created_at INTEGER NOT NULL,
      awarded_by TEXT,
      UNIQUE(topic_id, user_id)
    );
  `);

  // Reports table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      resolved_by TEXT REFERENCES users(id),
      resolved_at INTEGER,
      created_at INTEGER NOT NULL
    );
  `);

  // Saved posts table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS saved_posts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      saved_at INTEGER NOT NULL,
      UNIQUE(user_id, post_id)
    );
  `);

  // Direct messages table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS direct_messages (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subject TEXT,
      content TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      parent_id TEXT,
      created_at INTEGER NOT NULL
    );
  `);

  // User blocks table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS user_blocks (
      id TEXT PRIMARY KEY,
      blocker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      blocked_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      UNIQUE(blocker_id, blocked_id)
    );
  `);

  // Mod logs table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS mod_logs (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      moderator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      reason TEXT,
      details TEXT,
      created_at INTEGER NOT NULL
    );
  `);

  // Automod rules table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS automod_rules (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      priority INTEGER NOT NULL DEFAULT 0,
      conditions TEXT NOT NULL,
      action TEXT NOT NULL,
      action_data TEXT,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // User mentions table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS user_mentions (
      id TEXT PRIMARY KEY,
      mentioner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      mentioned_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      post_id TEXT REFERENCES posts(id) ON DELETE CASCADE,
      comment_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL
    );
  `);
}

/**
 * Clean up all database tables before/after tests
 */
export const cleanDatabase = async () => {
  // Initialize database on first clean
  await initializeDatabase();

  // Use the actual table names
  const tables = [
    'user_mentions',
    'automod_rules',
    'mod_logs',
    'user_blocks',
    'direct_messages',
    'saved_posts',
    'reports',
    'user_badges',
    'post_tags',
    'notifications',
    'votes',
    'comments',
    'posts',
    'topic_members',
    'topics',
    'users',
  ];

  // Disable foreign key constraints temporarily for cleanup
  sqlite.exec('PRAGMA foreign_keys = OFF;');

  // Delete in reverse order to handle foreign key constraints
  for (const table of tables) {
    sqlite.exec(`DELETE FROM ${table};`);
  }

  // Re-enable foreign key constraints
  sqlite.exec('PRAGMA foreign_keys = ON;');
};

/**
 * Disconnect from database
 */
export const disconnectDatabase = async () => {
  if (sqlite) {
    sqlite.close();
  }
};

/**
 * Get Drizzle database instance for tests
 */
export const getTestDb = () => db;

export default {
  clean: cleanDatabase,
  disconnect: disconnectDatabase,
  db,
};
