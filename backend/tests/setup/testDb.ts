/**
 * Test database setup using SQLite
 * Provides isolated, fast test database for unit tests
 */

import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.sqlite';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create an in-memory SQLite database for testing
 */
export function createTestDb() {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });

  // Create all tables
  initializeTables(sqlite);

  return { db, sqlite };
}

/**
 * Initialize SQLite tables based on schema
 */
function initializeTables(sqlite: Database.Database) {
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
      topic_id TEXT NOT NULL REFERENCES topics(id),
      user_id TEXT NOT NULL REFERENCES users(id),
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
      topic_id TEXT NOT NULL REFERENCES topics(id),
      author_id TEXT NOT NULL REFERENCES users(id),
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
      post_id TEXT NOT NULL REFERENCES posts(id),
      author_id TEXT NOT NULL REFERENCES users(id),
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
      user_id TEXT NOT NULL REFERENCES users(id),
      post_id TEXT REFERENCES posts(id),
      comment_id TEXT REFERENCES comments(id),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(user_id, post_id),
      UNIQUE(user_id, comment_id)
    );
  `);

  // Add other tables as needed for tests...
}

/**
 * Helper to generate UUID for tests
 */
export function generateId(): string {
  return uuidv4();
}

/**
 * Helper to get current timestamp for tests
 */
export function now(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Close and cleanup test database
 */
export function closeTestDb(sqlite: Database.Database) {
  sqlite.close();
}
