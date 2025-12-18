/**
 * Example test using SQLite test database
 * Demonstrates how to set up and use the test database
 */

import { getTestDb, cleanDatabase, disconnectDatabase } from './utils/testDb';
import { users } from './setup/schema.sqlite';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

describe('Example Test with SQLite', () => {
  beforeEach(async () => {
    // Clean database before each test
    await cleanDatabase();
  });

  afterAll(async () => {
    // Disconnect after all tests
    await disconnectDatabase();
  });

  it('should create and retrieve a user', async () => {
    const db = getTestDb();
    const userId = randomUUID();
    const timestamp = new Date();

    // Insert a user
    await db.insert(users).values({
      id: userId,
      email: 'test@example.com',
      username: 'testuser',
      passwordHash: 'hashed_password',
      avatarStyle: 'bottts',
      avatarSeed: 'random_seed',
      isSuperuser: false,
      postCred: 0,
      commentCred: 0,
      emailVerified: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    // Retrieve the user
    const retrievedUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    // Assertions
    expect(retrievedUser).toBeDefined();
    expect(retrievedUser?.email).toBe('test@example.com');
    expect(retrievedUser?.username).toBe('testuser');
    expect(retrievedUser?.isSuperuser).toBe(false);
  });
});
