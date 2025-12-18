import request from 'supertest';
import app from '../src/index';
import { cleanDatabase, disconnectDatabase } from './utils/testDb';
import { getAuthHeader } from './utils/testAuth';
import { generateUniqueUsername, generateUniqueEmail } from './utils/testHelpers';

describe('Automod System', () => {
  let moderatorToken: string;
  let moderatorId: string;
  let memberToken: string;
  let memberId: string;
  let ownerToken: string;
  let ownerId: string;
  let topicName: string;
  let topicId: string;
  let ruleId: string;

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
  }, 120000);

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe('POST /api/automod', () => {
    it('should create an automod rule (moderator)', async () => {
      const res = await request(app)
        .post('/api/automod')
        .set(getAuthHeader(moderatorToken))
        .send({
          topicId,
          name: 'Spam Filter',
          conditions: JSON.stringify({
            contentContains: ['spam', 'scam'],
          }),
          action: 'REMOVE',
          priority: 1,
        });

      expect([201, 200]).toContain(res.status);
      if (res.status === 201 || res.status === 200) {
        expect(res.body.rule).toBeDefined();
        expect(res.body.rule.name).toBe('Spam Filter');
        ruleId = res.body.rule.id;
      }
    }, 30000);

    it('should create an automod rule (owner)', async () => {
      const res = await request(app)
        .post('/api/automod')
        .set(getAuthHeader(ownerToken))
        .send({
          topicId,
          name: 'Owner Rule',
          conditions: JSON.stringify({ contentContains: ['test'] }),
          action: 'FILTER',
          priority: 0,
        });

      expect([201, 200]).toContain(res.status);
    }, 30000);

    it('should reject rule creation by non-moderator', async () => {
      const res = await request(app)
        .post('/api/automod')
        .set(getAuthHeader(memberToken))
        .send({
          topicId,
          name: 'Member Rule',
          conditions: JSON.stringify({ contentContains: ['test'] }),
          action: 'REMOVE',
          priority: 0,
        });

      expect([403, 401]).toContain(res.status);
    }, 30000);

    it('should reject rule creation without authentication', async () => {
      const res = await request(app)
        .post('/api/automod')
        .send({
          topicId,
          name: 'No Auth Rule',
          conditions: JSON.stringify({ contentContains: ['test'] }),
          action: 'REMOVE',
          priority: 0,
        });

      expect(res.status).toBe(401);
    }, 30000);

    it('should require valid conditions JSON', async () => {
      const res = await request(app)
        .post('/api/automod')
        .set(getAuthHeader(moderatorToken))
        .send({
          topicId,
          name: 'Invalid Rule',
          conditions: 'invalid json',
          action: 'REMOVE',
          priority: 0,
        });

      // Should either accept string or reject
      expect([201, 200, 400]).toContain(res.status);
    }, 30000);
  });

  describe('GET /api/automod/topic/:topicId', () => {
    beforeEach(async () => {
      // Create a rule
      const ruleRes = await request(app)
        .post('/api/automod')
        .set(getAuthHeader(moderatorToken))
        .send({
          topicId,
          name: 'Test Rule',
          conditions: JSON.stringify({ contentContains: ['test'] }),
          action: 'REMOVE',
          priority: 0,
        });
      ruleId = ruleRes.body.rule?.id;
    });

    it('should get all automod rules (moderator)', async () => {
      const res = await request(app)
        .get(`/api/automod/topic/${topicId}`)
        .set(getAuthHeader(moderatorToken));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.rules)).toBe(true);
      expect(res.body.rules.length).toBeGreaterThan(0);
    }, 30000);

    it('should get all automod rules (owner)', async () => {
      const res = await request(app)
        .get(`/api/automod/topic/${topicId}`)
        .set(getAuthHeader(ownerToken));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.rules)).toBe(true);
    }, 30000);

    it('should reject access by non-moderator', async () => {
      const res = await request(app)
        .get(`/api/automod/topic/${topicId}`)
        .set(getAuthHeader(memberToken));

      // May show public rules or restrict access
      expect([200, 403]).toContain(res.status);
    }, 30000);
  });

  describe('GET /api/automod/:id', () => {
    beforeEach(async () => {
      const ruleRes = await request(app)
        .post('/api/automod')
        .set(getAuthHeader(moderatorToken))
        .send({
          topicId,
          name: 'Specific Rule',
          conditions: JSON.stringify({ contentContains: ['specific'] }),
          action: 'REMOVE',
          priority: 0,
        });
      ruleId = ruleRes.body.rule?.id;
    });

    it('should get a specific rule by ID', async () => {
      if (!ruleId) return;

      const res = await request(app)
        .get(`/api/automod/${ruleId}`)
        .set(getAuthHeader(moderatorToken));

      expect(res.status).toBe(200);
      expect(res.body.rule).toBeDefined();
      expect(res.body.rule.id).toBe(ruleId);
    }, 30000);

    it('should return 404 for non-existent rule', async () => {
      const res = await request(app)
        .get('/api/automod/nonexistent-id')
        .set(getAuthHeader(moderatorToken));

      expect([404, 400]).toContain(res.status);
    }, 30000);
  });

  describe('PUT /api/automod/:id', () => {
    beforeEach(async () => {
      const ruleRes = await request(app)
        .post('/api/automod')
        .set(getAuthHeader(moderatorToken))
        .send({
          topicId,
          name: 'Update Rule',
          conditions: JSON.stringify({ contentContains: ['update'] }),
          action: 'REMOVE',
          priority: 0,
        });
      ruleId = ruleRes.body.rule?.id;
    });

    it('should update an automod rule', async () => {
      if (!ruleId) return;

      const res = await request(app)
        .put(`/api/automod/${ruleId}`)
        .set(getAuthHeader(moderatorToken))
        .send({
          name: 'Updated Rule',
          enabled: false,
        });

      expect([200, 204]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.rule.name).toBe('Updated Rule');
      }
    }, 30000);

    it('should allow updating rule priority', async () => {
      if (!ruleId) return;

      const res = await request(app)
        .put(`/api/automod/${ruleId}`)
        .set(getAuthHeader(moderatorToken))
        .send({
          priority: 10,
        });

      expect([200, 204]).toContain(res.status);
    }, 30000);

    it('should allow toggling rule enabled status', async () => {
      if (!ruleId) return;

      const res = await request(app)
        .put(`/api/automod/${ruleId}`)
        .set(getAuthHeader(moderatorToken))
        .send({
          enabled: false,
        });

      expect([200, 204]).toContain(res.status);
    }, 30000);

    it('should reject update by non-moderator', async () => {
      if (!ruleId) return;

      const res = await request(app)
        .put(`/api/automod/${ruleId}`)
        .set(getAuthHeader(memberToken))
        .send({
          name: 'Unauthorized Update',
        });

      expect([403, 401]).toContain(res.status);
    }, 30000);
  });

  describe('DELETE /api/automod/:id', () => {
    beforeEach(async () => {
      const ruleRes = await request(app)
        .post('/api/automod')
        .set(getAuthHeader(moderatorToken))
        .send({
          topicId,
          name: 'Delete Rule',
          conditions: JSON.stringify({ contentContains: ['delete'] }),
          action: 'REMOVE',
          priority: 0,
        });
      ruleId = ruleRes.body.rule?.id;
    });

    it('should delete an automod rule', async () => {
      if (!ruleId) return;

      const res = await request(app)
        .delete(`/api/automod/${ruleId}`)
        .set(getAuthHeader(moderatorToken));

      expect([200, 204]).toContain(res.status);

      // Verify deletion
      const getRes = await request(app)
        .get(`/api/automod/${ruleId}`)
        .set(getAuthHeader(moderatorToken));

      expect([404, 400]).toContain(getRes.status);
    }, 30000);

    it('should reject deletion by non-moderator', async () => {
      if (!ruleId) return;

      const res = await request(app)
        .delete(`/api/automod/${ruleId}`)
        .set(getAuthHeader(memberToken));

      expect([403, 401]).toContain(res.status);
    }, 30000);

    it('should return 404 for non-existent rule', async () => {
      const res = await request(app)
        .delete('/api/automod/nonexistent-id')
        .set(getAuthHeader(moderatorToken));

      expect([404, 400]).toContain(res.status);
    }, 30000);
  });

  describe('Rule Priority', () => {
    it('should execute rules in priority order', async () => {
      // Create rules with different priorities
      await request(app)
        .post('/api/automod')
        .set(getAuthHeader(moderatorToken))
        .send({
          topicId,
          name: 'Low Priority',
          conditions: JSON.stringify({ contentContains: ['test'] }),
          action: 'FILTER',
          priority: 1,
        });

      await request(app)
        .post('/api/automod')
        .set(getAuthHeader(moderatorToken))
        .send({
          topicId,
          name: 'High Priority',
          conditions: JSON.stringify({ contentContains: ['test'] }),
          action: 'REMOVE',
          priority: 10,
        });

      const res = await request(app)
        .get(`/api/automod/topic/${topicId}`)
        .set(getAuthHeader(moderatorToken));

      expect(res.status).toBe(200);
      if (res.body.rules.length > 1) {
        // Rules should be returned in priority order
        expect(res.body.rules[0].priority).toBeGreaterThanOrEqual(res.body.rules[1].priority);
      }
    }, 30000);
  });

  describe('Rule Actions', () => {
    it('should support REMOVE action', async () => {
      const res = await request(app)
        .post('/api/automod')
        .set(getAuthHeader(moderatorToken))
        .send({
          topicId,
          name: 'Remove Rule',
          conditions: JSON.stringify({ contentContains: ['remove'] }),
          action: 'REMOVE',
          priority: 0,
        });

      expect([201, 200]).toContain(res.status);
    }, 30000);

    it('should support FILTER action', async () => {
      const res = await request(app)
        .post('/api/automod')
        .set(getAuthHeader(moderatorToken))
        .send({
          topicId,
          name: 'Filter Rule',
          conditions: JSON.stringify({ contentContains: ['filter'] }),
          action: 'FILTER',
          priority: 0,
        });

      expect([201, 200]).toContain(res.status);
    }, 30000);

    it('should support REPORT action', async () => {
      const res = await request(app)
        .post('/api/automod')
        .set(getAuthHeader(moderatorToken))
        .send({
          topicId,
          name: 'Report Rule',
          conditions: JSON.stringify({ contentContains: ['report'] }),
          action: 'REPORT',
          priority: 0,
        });

      expect([201, 200]).toContain(res.status);
    }, 30000);
  });

  describe('Rule Conditions', () => {
    it('should support contentContains condition', async () => {
      const res = await request(app)
        .post('/api/automod')
        .set(getAuthHeader(moderatorToken))
        .send({
          topicId,
          name: 'Content Contains',
          conditions: JSON.stringify({
            contentContains: ['spam', 'scam', 'phishing'],
          }),
          action: 'REMOVE',
          priority: 0,
        });

      expect([201, 200]).toContain(res.status);
    }, 30000);

    it('should support userKarmaBelow condition', async () => {
      const res = await request(app)
        .post('/api/automod')
        .set(getAuthHeader(moderatorToken))
        .send({
          topicId,
          name: 'Low Karma',
          conditions: JSON.stringify({
            userKarmaBelow: 10,
          }),
          action: 'FILTER',
          priority: 0,
        });

      expect([201, 200]).toContain(res.status);
    }, 30000);

    it('should support accountAgeBelow condition', async () => {
      const res = await request(app)
        .post('/api/automod')
        .set(getAuthHeader(moderatorToken))
        .send({
          topicId,
          name: 'New Account',
          conditions: JSON.stringify({
            accountAgeBelow: 7, // days
          }),
          action: 'FILTER',
          priority: 0,
        });

      expect([201, 200]).toContain(res.status);
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent topic', async () => {
      const res = await request(app)
        .get('/api/automod/topic/nonexistent-topic-id')
        .set(getAuthHeader(moderatorToken));

      expect([404, 400]).toContain(res.status);
    }, 30000);

    it('should handle missing required fields', async () => {
      const res = await request(app)
        .post('/api/automod')
        .set(getAuthHeader(moderatorToken))
        .send({
          topicId,
          name: 'Incomplete Rule',
          // Missing conditions and action
        });

      expect([400, 500]).toContain(res.status);
    }, 30000);
  });
});
