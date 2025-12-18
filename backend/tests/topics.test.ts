import request from 'supertest';
import app from '../src/index';
import { cleanDatabase, disconnectDatabase } from './utils/testDb';
import { createTestUser, getAuthHeader } from './utils/testAuth';
import { generateUniqueUsername, generateUniqueEmail } from './utils/testHelpers';

describe('Topics API', () => {
  let ownerToken: string;
  let ownerUserId: string;
  let memberToken: string;
  let memberUserId: string;
  let nonMemberToken: string;
  let nonMemberUserId: string;
  let testTopicName: string;

  beforeEach(async () => {
    await cleanDatabase();

    // Create owner user
    const ownerRes = await request(app)
      .post('/api/auth/register')
      .send({
        username: generateUniqueUsername(),
        email: generateUniqueEmail(),
        password: 'Test123!@#',
        agreedToTerms: true,
      });
    ownerToken = ownerRes.body.accessToken;
    ownerUserId = ownerRes.body.user.id;

    // Create member user
    const memberRes = await request(app)
      .post('/api/auth/register')
      .send({
        username: generateUniqueUsername(),
        email: generateUniqueEmail(),
        password: 'Test123!@#',
        agreedToTerms: true,
      });
    memberToken = memberRes.body.accessToken;
    memberUserId = memberRes.body.user.id;

    // Create non-member user
    const nonMemberRes = await request(app)
      .post('/api/auth/register')
      .send({
        username: generateUniqueUsername(),
        email: generateUniqueEmail(),
        password: 'Test123!@#',
        agreedToTerms: true,
      });
    nonMemberToken = nonMemberRes.body.accessToken;
    nonMemberUserId = nonMemberRes.body.user.id;
  }, 90000);

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe('POST /api/topics', () => {
    it('should create a new topic', async () => {
      const res = await request(app)
        .post('/api/topics')
        .set(getAuthHeader(ownerToken))
        .send({
          displayName: 'Test Topic',
          description: 'A test topic',
          rules: 'Be nice',
        });

      expect(res.status).toBe(201);
      expect(res.body.topic).toHaveProperty('id');
      expect(res.body.topic.displayName).toBe('Test Topic');
      expect(res.body.topic.description).toBe('A test topic');
      expect(res.body.topic).toHaveProperty('name'); // Slugified name
      testTopicName = res.body.topic.name;
    }, 30000);

    it('should reject topic creation without authentication', async () => {
      const res = await request(app)
        .post('/api/topics')
        .send({
          displayName: 'Test Topic',
        });

      expect(res.status).toBe(401);
    });

    it('should reject topic creation without display name', async () => {
      const res = await request(app)
        .post('/api/topics')
        .set(getAuthHeader(ownerToken))
        .send({
          description: 'A test topic',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/topics', () => {
    beforeEach(async () => {
      // Create a test topic
      const res = await request(app)
        .post('/api/topics')
        .set(getAuthHeader(ownerToken))
        .send({
          displayName: 'Test Topic',
          description: 'A test topic',
        });
      testTopicName = res.body.topic.name;
    });

    it('should get all topics', async () => {
      const res = await request(app)
        .get('/api/topics');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    }, 30000);

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/topics?page=1&limit=10');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
    });

    it('should support sorting', async () => {
      const res = await request(app)
        .get('/api/topics?sort=new');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });
  });

  describe('GET /api/topics/:name', () => {
    beforeEach(async () => {
      const res = await request(app)
        .post('/api/topics')
        .set(getAuthHeader(ownerToken))
        .send({
          displayName: 'Test Topic',
          description: 'A test topic',
        });
      testTopicName = res.body.topic.name;
    });

    it('should get a topic by name', async () => {
      const res = await request(app)
        .get(`/api/topics/${testTopicName}`);

      expect(res.status).toBe(200);
      expect(res.body.topic).toHaveProperty('id');
      expect(res.body.topic.name).toBe(testTopicName);
    }, 30000);

    it('should return 404 for non-existent topic', async () => {
      const res = await request(app)
        .get('/api/topics/nonexistenttopic');

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/topics/:name', () => {
    beforeEach(async () => {
      const res = await request(app)
        .post('/api/topics')
        .set(getAuthHeader(ownerToken))
        .send({
          displayName: 'Test Topic',
          description: 'A test topic',
        });
      testTopicName = res.body.topic.name;
    });

    it('should update topic (owner only)', async () => {
      const res = await request(app)
        .put(`/api/topics/${testTopicName}`)
        .set(getAuthHeader(ownerToken))
        .send({
          description: 'Updated description',
          rules: 'New rules',
        });

      expect(res.status).toBe(200);
      expect(res.body.topic.description).toBe('Updated description');
      expect(res.body.topic.rules).toBe('New rules');
    }, 30000);

    it('should reject update by non-owner', async () => {
      const res = await request(app)
        .put(`/api/topics/${testTopicName}`)
        .set(getAuthHeader(memberToken))
        .send({
          description: 'Updated description',
        });

      expect(res.status).toBe(403);
    });

    it('should reject update without authentication', async () => {
      const res = await request(app)
        .put(`/api/topics/${testTopicName}`)
        .send({
          description: 'Updated description',
        });

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/topics/:name', () => {
    beforeEach(async () => {
      const res = await request(app)
        .post('/api/topics')
        .set(getAuthHeader(ownerToken))
        .send({
          displayName: 'Test Topic',
          description: 'A test topic',
        });
      testTopicName = res.body.topic.name;
    });

    it('should delete topic (owner only)', async () => {
      const res = await request(app)
        .delete(`/api/topics/${testTopicName}`)
        .set(getAuthHeader(ownerToken));

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Topic deleted successfully');
    }, 30000);

    it('should reject delete by non-owner', async () => {
      const res = await request(app)
        .delete(`/api/topics/${testTopicName}`)
        .set(getAuthHeader(memberToken));

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/topics/:name/join', () => {
    beforeEach(async () => {
      const res = await request(app)
        .post('/api/topics')
        .set(getAuthHeader(ownerToken))
        .send({
          displayName: 'Test Topic',
          description: 'A test topic',
        });
      testTopicName = res.body.topic.name;
    });

    it('should join a topic', async () => {
      const res = await request(app)
        .post(`/api/topics/${testTopicName}/join`)
        .set(getAuthHeader(memberToken));

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Successfully joined topic');
    }, 30000);

    it('should reject join without authentication', async () => {
      const res = await request(app)
        .post(`/api/topics/${testTopicName}/join`);

      expect(res.status).toBe(401);
    });

    it('should handle duplicate join gracefully', async () => {
      // Join once
      await request(app)
        .post(`/api/topics/${testTopicName}/join`)
        .set(getAuthHeader(memberToken));

      // Try to join again
      const res = await request(app)
        .post(`/api/topics/${testTopicName}/join`)
        .set(getAuthHeader(memberToken));

      // Should either succeed or return an appropriate error
      expect([200, 400, 409]).toContain(res.status);
    });
  });

  describe('POST /api/topics/:name/leave', () => {
    beforeEach(async () => {
      const res = await request(app)
        .post('/api/topics')
        .set(getAuthHeader(ownerToken))
        .send({
          displayName: 'Test Topic',
          description: 'A test topic',
        });
      testTopicName = res.body.topic.name;

      // Join the topic first
      await request(app)
        .post(`/api/topics/${testTopicName}/join`)
        .set(getAuthHeader(memberToken));
    });

    it('should leave a topic', async () => {
      const res = await request(app)
        .post(`/api/topics/${testTopicName}/leave`)
        .set(getAuthHeader(memberToken));

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Successfully left topic');
    }, 30000);

    it('should reject leave without authentication', async () => {
      const res = await request(app)
        .post(`/api/topics/${testTopicName}/leave`);

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/topics/:name/moderators', () => {
    beforeEach(async () => {
      const res = await request(app)
        .post('/api/topics')
        .set(getAuthHeader(ownerToken))
        .send({
          displayName: 'Test Topic',
          description: 'A test topic',
        });
      testTopicName = res.body.topic.name;
    });

    it('should appoint a moderator (owner only)', async () => {
      // First, join the topic as member
      await request(app)
        .post(`/api/topics/${testTopicName}/join`)
        .set(getAuthHeader(memberToken));

      const res = await request(app)
        .post(`/api/topics/${testTopicName}/moderators`)
        .set(getAuthHeader(ownerToken))
        .send({
          userId: memberUserId,
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Moderator appointed successfully');
    }, 30000);

    it('should reject moderator appointment by non-owner', async () => {
      const res = await request(app)
        .post(`/api/topics/${testTopicName}/moderators`)
        .set(getAuthHeader(memberToken))
        .send({
          userId: nonMemberUserId,
        });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/topics/:name/moderators/:userId', () => {
    beforeEach(async () => {
      const res = await request(app)
        .post('/api/topics')
        .set(getAuthHeader(ownerToken))
        .send({
          displayName: 'Test Topic',
          description: 'A test topic',
        });
      testTopicName = res.body.topic.name;

      // Join the topic as member first
      await request(app)
        .post(`/api/topics/${testTopicName}/join`)
        .set(getAuthHeader(memberToken));

      // Appoint moderator
      await request(app)
        .post(`/api/topics/${testTopicName}/moderators`)
        .set(getAuthHeader(ownerToken))
        .send({
          userId: memberUserId,
        });
    });

    it('should remove a moderator (owner only)', async () => {
      const res = await request(app)
        .delete(`/api/topics/${testTopicName}/moderators/${memberUserId}`)
        .set(getAuthHeader(ownerToken));

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Moderator removed successfully');
    }, 30000);

    it('should reject moderator removal by non-owner', async () => {
      const res = await request(app)
        .delete(`/api/topics/${testTopicName}/moderators/${memberUserId}`)
        .set(getAuthHeader(nonMemberToken));

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/topics/:name/ban', () => {
    let moderatorToken: string;
    let moderatorUserId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/topics')
        .set(getAuthHeader(ownerToken))
        .send({
          displayName: 'Test Topic',
          description: 'A test topic',
        });
      testTopicName = res.body.topic.name;

      // Create and appoint a moderator
      const modRes = await request(app)
        .post('/api/auth/register')
        .send({
          username: generateUniqueUsername(),
          email: generateUniqueEmail(),
          password: 'Test123!@#',
          agreedToTerms: true,
        });
      moderatorToken = modRes.body.accessToken;
      moderatorUserId = modRes.body.user.id;

      // Join the topic as moderator first
      await request(app)
        .post(`/api/topics/${testTopicName}/join`)
        .set(getAuthHeader(moderatorToken));

      // Appoint moderator
      await request(app)
        .post(`/api/topics/${testTopicName}/moderators`)
        .set(getAuthHeader(ownerToken))
        .send({
          userId: moderatorUserId,
        });
    });

    it('should ban a user (moderator only)', async () => {
      // First, join the topic as the user to be banned
      await request(app)
        .post(`/api/topics/${testTopicName}/join`)
        .set(getAuthHeader(nonMemberToken));

      const res = await request(app)
        .post(`/api/topics/${testTopicName}/ban`)
        .set(getAuthHeader(moderatorToken))
        .send({
          userId: nonMemberUserId,
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('User banned successfully');
    }, 30000);

    it('should reject ban by non-moderator', async () => {
      const res = await request(app)
        .post(`/api/topics/${testTopicName}/ban`)
        .set(getAuthHeader(memberToken))
        .send({
          userId: nonMemberUserId,
        });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/topics/:name/unban', () => {
    let moderatorToken: string;
    let moderatorUserId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/topics')
        .set(getAuthHeader(ownerToken))
        .send({
          displayName: 'Test Topic',
          description: 'A test topic',
        });
      testTopicName = res.body.topic.name;

      // Create and appoint a moderator
      const modRes = await request(app)
        .post('/api/auth/register')
        .send({
          username: generateUniqueUsername(),
          email: generateUniqueEmail(),
          password: 'Test123!@#',
          agreedToTerms: true,
        });
      moderatorToken = modRes.body.accessToken;
      moderatorUserId = modRes.body.user.id;

      // Join the topic as moderator first
      await request(app)
        .post(`/api/topics/${testTopicName}/join`)
        .set(getAuthHeader(moderatorToken));

      // Appoint moderator
      await request(app)
        .post(`/api/topics/${testTopicName}/moderators`)
        .set(getAuthHeader(ownerToken))
        .send({
          userId: moderatorUserId,
        });

      // Join the topic as the user to be banned
      await request(app)
        .post(`/api/topics/${testTopicName}/join`)
        .set(getAuthHeader(nonMemberToken));

      // Ban user
      await request(app)
        .post(`/api/topics/${testTopicName}/ban`)
        .set(getAuthHeader(moderatorToken))
        .send({
          userId: nonMemberUserId,
        });
    });

    it('should unban a user (moderator only)', async () => {
      const res = await request(app)
        .post(`/api/topics/${testTopicName}/unban`)
        .set(getAuthHeader(moderatorToken))
        .send({
          userId: nonMemberUserId,
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('User unbanned successfully');
    }, 30000);

    it('should reject unban by non-moderator', async () => {
      const res = await request(app)
        .post(`/api/topics/${testTopicName}/unban`)
        .set(getAuthHeader(memberToken))
        .send({
          userId: nonMemberUserId,
        });

      expect(res.status).toBe(403);
    });
  });
});
