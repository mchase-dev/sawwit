// Mock database for tests - uses SQLite instead of PostgreSQL
import { getTestDb, initializeDatabase } from '../../../tests/utils/testDb';
import { randomUUID } from 'crypto';

// Re-export the SQLite schema as if it were the production schema
export * from '../../../tests/setup/schema.sqlite';

// Initialize test database when mock is loaded
initializeDatabase();

// Get the original test database
const originalDb = getTestDb();

// Create a proxy to intercept insert operations and auto-generate UUIDs
const dbProxy = new Proxy(originalDb, {
  get(target, prop) {
    const original = target[prop as keyof typeof target];

    // Intercept insert operations
    if (prop === 'insert') {
      return function(table: any) {
        const insertObj = original.call(target, table);
        const originalValues = insertObj.values;

        insertObj.values = function(values: any) {
          const now = new Date();

          // Auto-generate UUID for id field if not provided
          // PostgreSQL uses defaultRandom() but SQLite needs manual generation
          if (!values.id && table) {
            values = { ...values, id: randomUUID() };
          }

          // Auto-generate createdAt if not provided
          // PostgreSQL uses defaultNow() but SQLite needs manual generation
          if (!values.createdAt) {
            values = { ...values, createdAt: now };
          }

          // Auto-generate updatedAt if not provided
          // PostgreSQL uses defaultNow() but SQLite needs manual generation
          if (!values.updatedAt) {
            values = { ...values, updatedAt: now };
          }

          // Auto-generate lastActivityAt if not provided (for topics table)
          // PostgreSQL uses defaultNow() but SQLite needs manual generation
          if (!values.lastActivityAt) {
            values = { ...values, lastActivityAt: now };
          }

          // Auto-generate joinedAt if not provided (for topicMembers table)
          // PostgreSQL uses defaultNow() but SQLite needs manual generation
          if (!values.joinedAt) {
            values = { ...values, joinedAt: now };
          }

          // Auto-generate savedAt if not provided (for savedPosts table)
          // PostgreSQL uses defaultNow() but SQLite needs manual generation
          if (!values.savedAt) {
            values = { ...values, savedAt: now };
          }

          return originalValues.call(insertObj, values);
        };

        return insertObj;
      };
    }

    return original;
  }
});

// Export the proxied database
export const db = dbProxy as typeof originalDb;
