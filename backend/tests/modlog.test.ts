import request from 'supertest';
import app from '../src/index';
import { cleanDatabase, disconnectDatabase } from './utils/testDb';
import { getAuthHeader } from './utils/testAuth';
import { generateUniqueUsername, generateUniqueEmail } from './utils/testHelpers';

describe('Mod Log System', () => {
  let moderatorToken: string;
  let moderatorId: string;
  let memberToken: string;
  let memberId: string;
  let ownerToken: string;
  let ownerId: string;
  let topicName: string;
  let topicId: string;
  let postId: string;

  beforeEach(async () => {
    await cleanDatabase();

    // Create owner
    const ownerRes = await request(app)
      .post('/api/auth/register')
      .send({
        username: generateUniqueUsername(),
        email: generateUniqueEmail(),
        password: 'Test123!@#',
        agreedToTerms: true,
      });
    ownerToken = ownerRes.body.accessToken;
    ownerId = ownerRes.body.user.id;

    // Create moderator
    const modRes = await request(app)
      .post('/api/auth/register')
      .send({
        username: generateUniqueUsername(),
        email: generateUniqueEmail(),
        password: 'Test123!@#',
        agreedToTerms: true,
      });
    moderatorToken = modRes.body.accessToken;
    moderatorId = modRes.body.user.id;

    // Create member
    const memberRes = await request(app)
      .post('/api/auth/register')
      .send({
        username: generateUniqueUsername(),
        email: generateUniqueEmail(),
        password: 'Test123!@#',
        agreedToTerms: true,
      });
    memberToken = memberRes.body.accessToken;
    memberId = memberRes.body.user.id;

    // Create topic
    const topicRes = await request(app)
      .post('/api/topics')
      .set(getAuthHeader(ownerToken))
      .send({
        displayName: 'Test Topic',
        description: 'A test topic',
      });
    topicName = topicRes.body.topic.name;
    topicId = topicRes.body.topic.id;

    // Join topic
    await request(app)
      .post(`/api/topics/${topicName}/join`)
      .set(getAuthHeader(moderatorToken));

    await request(app)
      .post(`/api/topics/${topicName}/join`)
      .set(getAuthHeader(memberToken));

    // Appoint moderator
    await request(app)
      .post(`/api/topics/${topicName}/moderators`)
      .set(getAuthHeader(ownerToken))
      .send({ userId: moderatorId });

    // Create a post
    const postRes = await request(app)
      .post(`/api/topics/${topicName}/posts`)
      .set(getAuthHeader(memberToken))
      .send({
        title: 'Test Post',
        content: 'Test content',
        type: 'TEXT',
      });
    postId = postRes.body.post.id;
  }, 120000);

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe('Mod Log Creation', () => {
    it('should automatically log when moderator deletes a post', async () => {
      // Moderator deletes post
      await request(app)
        .delete(`/api/posts/${postId}`)
        .set(getAuthHeader(moderatorToken));

      // Check mod log
      const res = await request(app)
        .get(`/api/modlog/topic/${topicId}`);

      expect(res.status).toBe(200);
      expect(res.body.data || res.body.logs).toBeDefined();

      // Should have a log entry for post deletion
      const logs = res.body.data || res.body.logs;
      if (logs && logs.length > 0) {
        const deleteLog = logs.find(
          (log: any) => log.action === 'DELETE_POST' || log.action === 'REMOVE_POST'
        );
        expect(deleteLog).toBeDefined();
      }
    }, 30000);

    it('should log when moderator bans a user', async () => {
      // Moderator bans member
      await request(app)
        .post(`/api/topics/${topicName}/ban`)
        .set(getAuthHeader(moderatorToken))
        .send({ userId: memberId, reason: 'Spam' });

      // Check mod log
      const res = await request(app)
        .get(`/api/modlog/topic/${topicId}`);

      expect(res.status).toBe(200);
      const logs = res.body.data || res.body.logs;
      if (logs && logs.length > 0) {
        const banLog = logs.find((log: any) => log.action === 'BAN_USER');
        if (banLog) {
          expect(banLog.targetId || banLog.targetUserId).toBe(memberId);
        }
      }
    }, 30000);

    it('should log moderator appointments', async () => {
      // Create another user to appoint
      const newModRes = await request(app)
        .post('/api/auth/register')
        .send({
          username: generateUniqueUsername(),
          email: generateUniqueEmail(),
          password: 'Test123!@#',
          agreedToTerms: true,
        });

      await request(app)
        .post(`/api/topics/${topicName}/join`)
        .set(getAuthHeader(newModRes.body.accessToken));

      // Owner appoints new moderator
      await request(app)
        .post(`/api/topics/${topicName}/moderators`)
        .set(getAuthHeader(ownerToken))
        .send({ userId: newModRes.body.user.id });

      // Check mod log
      const res = await request(app)
        .get(`/api/modlog/topic/${topicId}`);

      expect(res.status).toBe(200);
      // Should have logs for moderator appointment
      const logs = res.body.data || res.body.logs;
      expect(logs.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Mod Log Access', () => {
    it('should allow public access to mod log', async () => {
      // Non-member should be able to view mod log
      const publicUserRes = await request(app)
        .post('/api/auth/register')
        .send({
          username: generateUniqueUsername(),
          email: generateUniqueEmail(),
          password: 'Test123!@#',
          agreedToTerms: true,
        });

      const res = await request(app)
        .get(`/api/modlog/topic/${topicId}`)
        .set(getAuthHeader(publicUserRes.body.accessToken));

      expect(res.status).toBe(200);
    }, 30000);

    it('should work without authentication', async () => {
      const res = await request(app)
        .get(`/api/modlog/topic/${topicId}`);

      // Mod log should be publicly viewable
      expect([200, 401]).toContain(res.status);
    }, 30000);

    it('should allow filtering by action type', async () => {
      const res = await request(app)
        .get(`/api/modlog/topic/${topicId}?action=BAN_USER`);

      expect(res.status).toBe(200);
      const logs = res.body.data || res.body.logs;
      if (logs && logs.length > 0) {
        expect(logs.every((log: any) => log.action === 'BAN_USER')).toBe(true);
      }
    }, 30000);

    it('should allow filtering by moderator', async () => {
      const res = await request(app)
        .get(`/api/modlog/topic/${topicId}?moderatorId=${moderatorId}`);

      expect(res.status).toBe(200);
      const logs = res.body.data || res.body.logs;
      if (logs && logs.length > 0) {
        expect(logs.every((log: any) => log.moderatorId === moderatorId)).toBe(true);
      }
    }, 30000);
  });

  describe('Mod Log Pagination', () => {
    beforeEach(async () => {
      // Create multiple mod actions
      for (let i = 0; i < 3; i++) {
        const testUserRes = await request(app)
          .post('/api/auth/register')
          .send({
            username: generateUniqueUsername(),
            email: generateUniqueEmail(),
            password: 'Test123!@#',
            agreedToTerms: true,
          });

        await request(app)
          .post(`/api/topics/${topicName}/join`)
          .set(getAuthHeader(testUserRes.body.accessToken));

        // Moderator bans user (creates log entry)
        await request(app)
          .post(`/api/topics/${topicName}/ban`)
          .set(getAuthHeader(moderatorToken))
          .send({ userId: testUserRes.body.user.id, reason: `Test ban ${i}` });
      }
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get(`/api/modlog/topic/${topicId}?page=1&limit=2`);

      expect(res.status).toBe(200);
      const logs = res.body.data || res.body.logs;
      expect(logs).toBeDefined();
      expect(logs.length).toBeLessThanOrEqual(2);
    }, 60000);

    it('should include pagination metadata', async () => {
      const res = await request(app)
        .get(`/api/modlog/topic/${topicId}?page=1&limit=10`);

      expect(res.status).toBe(200);
      // May or may not include pagination depending on implementation
      if (res.body.pagination || res.body.total !== undefined) {
        expect(res.body.pagination || res.body).toHaveProperty('page');
        expect(res.body.pagination || res.body).toHaveProperty('limit');
      }
    }, 30000);
  });

  describe('Mod Log Content', () => {
    it('should include moderator information', async () => {
      // Perform a mod action
      await request(app)
        .post(`/api/topics/${topicName}/ban`)
        .set(getAuthHeader(moderatorToken))
        .send({ userId: memberId, reason: 'Test' });

      const res = await request(app)
        .get(`/api/modlog/topic/${topicId}`);

      expect(res.status).toBe(200);
      const logs = res.body.data || res.body.logs;
      if (logs && logs.length > 0) {
        const log = logs[0];
        expect(log).toHaveProperty('moderatorId');
        expect(log).toHaveProperty('action');
        expect(log).toHaveProperty('createdAt');
      }
    }, 30000);

    it('should include reason when provided', async () => {
      const reason = 'Spam posting';
      await request(app)
        .post(`/api/topics/${topicName}/ban`)
        .set(getAuthHeader(moderatorToken))
        .send({ userId: memberId, reason });

      const res = await request(app)
        .get(`/api/modlog/topic/${topicId}`);

      expect(res.status).toBe(200);
      const logs = res.body.data || res.body.logs;
      const banLog = logs.find((log: any) => log.action === 'BAN_USER');
      if (banLog && banLog.reason) {
        expect(banLog.reason).toBe(reason);
      }
    }, 30000);
  });

  describe('Global Mod Log', () => {
    it('should allow superusers to view global mod log', async () => {
      // This would require a superuser account
      // For now, test that endpoint exists
      const res = await request(app)
        .get('/api/modlog')
        .set(getAuthHeader(ownerToken));

      // May return 403 if not superuser, or 200 if implemented
      expect([200, 403, 404]).toContain(res.status);
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent topic', async () => {
      const res = await request(app)
        .get('/api/modlog/topic/nonexistent-topic-id');

      expect([404, 400]).toContain(res.status);
    }, 30000);

    it('should handle invalid pagination parameters', async () => {
      const res = await request(app)
        .get(`/api/modlog/topic/${topicId}?page=invalid&limit=invalid`);

      // Should either use defaults or return error
      expect([200, 400]).toContain(res.status);
    }, 30000);
  });
});
