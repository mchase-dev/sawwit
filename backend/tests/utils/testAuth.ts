import request from 'supertest';
import bcrypt from 'bcrypt';
import { getTestDb } from './testDb';
import { users } from '../setup/schema.sqlite';
import { randomUUID } from 'crypto';

interface TestUser {
  id: string;
  username: string;
  email: string;
  token: string;
  refreshToken?: string;
}

/**
 * Create a test user in the database
 */
export const createTestUser = async (
  username: string = 'testuser',
  email: string = 'test@example.com',
  password: string = 'Test123!@#',
  agreedToTerms: boolean = true
): Promise<any> => {
  const hashedPassword = await bcrypt.hash(password, 10);
  const db = getTestDb();
  const now = new Date();

  const [user] = await db.insert(users).values({
    id: randomUUID(),
    username,
    email,
    passwordHash: hashedPassword,
    avatarStyle: 'bottts',
    avatarSeed: `seed_${Date.now()}`,
    agreedToTermsAt: agreedToTerms ? now : null,
    createdAt: now,
    updatedAt: now,
  }).returning();

  return user;
};

/**
 * Create a superuser for testing
 */
export const createSuperuser = async (): Promise<any> => {
  const hashedPassword = await bcrypt.hash('Admin123!@#', 10);
  const db = getTestDb();
  const now = new Date();

  const [user] = await db.insert(users).values({
    id: randomUUID(),
    username: 'superuser',
    email: 'super@example.com',
    passwordHash: hashedPassword,
    avatarStyle: 'bottts',
    avatarSeed: `seed_super_${Date.now()}`,
    isSuperuser: true,
    agreedToTermsAt: now,
    createdAt: now,
    updatedAt: now,
  }).returning();

  return user;
};

/**
 * Register a user and get authentication token
 */
export const registerAndLogin = async (
  app: any,
  username: string = 'testuser',
  email: string = 'test@example.com',
  password: string = 'Test123!@#'
): Promise<TestUser> => {
  // Register
  const registerRes = await request(app)
    .post('/api/auth/register')
    .send({
      username,
      email,
      password,
      agreedToTerms: true,
    });

  return {
    id: registerRes.body.user.id,
    username: registerRes.body.user.username,
    email: registerRes.body.user.email,
    token: registerRes.body.token,
    refreshToken: registerRes.body.refreshToken,
  };
};

/**
 * Login an existing user and get token
 */
export const loginUser = async (
  app: any,
  email: string = 'test@example.com',
  password: string = 'Test123!@#'
): Promise<TestUser> => {
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email, password });

  return {
    id: loginRes.body.user.id,
    username: loginRes.body.user.username,
    email: loginRes.body.user.email,
    token: loginRes.body.token,
    refreshToken: loginRes.body.refreshToken,
  };
};

/**
 * Get authorization header with token
 */
export const getAuthHeader = (token: string): { Authorization: string } => {
  return { Authorization: `Bearer ${token}` };
};

export default {
  createTestUser,
  createSuperuser,
  registerAndLogin,
  loginUser,
  getAuthHeader,
};
