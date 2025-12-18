import request from 'supertest';
import app from '../src/index';
import { cleanDatabase, disconnectDatabase } from './utils/testDb';
import { createTestUser, getAuthHeader } from './utils/testAuth';
import { generateUniqueEmail, generateUniqueUsername } from './utils/testHelpers';

describe('Authentication API', () => {
  beforeEach(async () => {
    await cleanDatabase();
  }, 90000); // 90 second timeout for database cleanup

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'Test123!@#',
          agreedToTerms: true,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.username).toBe('newuser');
      expect(res.body.user.email).toBe('newuser@example.com');
      expect(res.body.user).not.toHaveProperty('password');
    }, 60000); // 60 second timeout for first test

    it('should reject registration without terms agreement', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'Test123!@#',
          agreedToTerms: false,
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject registration with duplicate username', async () => {
      await createTestUser('testuser', 'test1@example.com');

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test2@example.com',
          password: 'Test123!@#',
          agreedToTerms: true,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toMatch(/username/i);
    });

    it('should reject registration with duplicate email', async () => {
      await createTestUser('testuser1', 'test@example.com');

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser2',
          email: 'test@example.com',
          password: 'Test123!@#',
          agreedToTerms: true,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toMatch(/email/i);
    });

    it('should reject registration with weak password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          email: 'newuser@example.com',
          password: '123',
          agreedToTerms: true,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/password/i);
    });

    it('should reject registration with invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          email: 'not-an-email',
          password: 'Test123!@#',
          agreedToTerms: true,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/email/i);
    });

    it('should reject registration with invalid username format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'ab', // too short
          email: 'test@example.com',
          password: 'Test123!@#',
          agreedToTerms: true,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/username/i);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await createTestUser('testuser', 'test@example.com', 'Test123!@#');
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test123!@#',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.username).toBe('testuser');
    }, 30000);

    it('should reject login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword123',
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Test123!@#',
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject login with missing credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      // Register and get tokens
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          username: generateUniqueUsername(),
          email: generateUniqueEmail(),
          password: 'Test123!@#',
          agreedToTerms: true,
        });

      const refreshToken = registerRes.body.refreshToken;

      // Wait a bit to ensure new token has different timestamp
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.accessToken).not.toBe(registerRes.body.accessToken);
    }, 30000);

    it('should reject refresh with invalid token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject refresh without token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully with valid token', async () => {
      // Register and login
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          username: generateUniqueUsername(),
          email: generateUniqueEmail(),
          password: 'Test123!@#',
          agreedToTerms: true,
        });

      const token = registerRes.body.accessToken;

      const res = await request(app)
        .post('/api/auth/logout')
        .set(getAuthHeader(token))
        .send();

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message');
    }, 30000);

    it('should handle logout without token gracefully', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .send();

      // Could be 401 if auth required, or 200 if it handles gracefully
      expect([200, 401]).toContain(res.status);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          username: generateUniqueUsername(),
          email: generateUniqueEmail(),
          password: 'Test123!@#',
          agreedToTerms: true,
        });

      const token = registerRes.body.accessToken;

      const res = await request(app)
        .get('/api/auth/me')
        .set(getAuthHeader(token));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.username).toBe(registerRes.body.user.username);
      expect(res.body.user).not.toHaveProperty('password');
    }, 30000);

    it('should reject request without token', async () => {
      const res = await request(app)
        .get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject request with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set(getAuthHeader('invalid-token'));

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });
  });
});
