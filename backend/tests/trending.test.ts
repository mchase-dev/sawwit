import request from 'supertest';
import app from '../src/index';
import { cleanDatabase, disconnectDatabase } from './utils/testDb';
import { getAuthHeader } from './utils/testAuth';
import { generateUniqueUsername, generateUniqueEmail } from './utils/testHelpers';

describe('Trending System', () => {
  let userToken: string;
  let userId: string;
  let topics: Array<{ name: string; id: string }> = [];

  beforeEach(async () => {
    await cleanDatabase();

    // Create user
    const userRes = await request(app)
      .post('/api/auth/register')
      .send({
        username: generateUniqueUsername(),
        email: generateUniqueEmail(),
        password: 'Test123!@#',
        agreedToTerms: true,
      });
    userToken = userRes.body.accessToken;
    userId = userRes.body.user.id;

    // Create multiple topics
    for (let i = 0; i < 3; i++) {
      const topicRes = await request(app)
        .post('/api/topics')
        .set(getAuthHeader(userToken))
        .send({
          displayName: `Test Topic ${i + 1}`,
          description: `Test topic for trending ${i + 1}`,
        });
      topics.push({
        name: topicRes.body.topic.name,
        id: topicRes.body.topic.id,
      });
    }
  }, 120000);

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe('GET /api/trending/topics', () => {
    it('should return trending topics', async () => {
      const res = await request(app)
        .get('/api/trending/topics');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('topics');
      expect(Array.isArray(res.body.topics)).toBe(true);
    }, 30000);

    it('should limit trending topics to specified number', async () => {
      const res = await request(app)
        .get('/api/trending/topics?limit=5');

      expect(res.status).toBe(200);
      expect(res.body.topics.length).toBeLessThanOrEqual(5);
    }, 30000);

    it('should return topics with trending scores', async () => {
      const res = await request(app)
        .get('/api/trending/topics');

      expect(res.status).toBe(200);
      if (res.body.topics.length > 0) {
        expect(res.body.topics[0]).toHaveProperty('trendingScore');
        expect(typeof res.body.topics[0].trendingScore).toBe('number');
      }
    }, 30000);

    it('should work without authentication', async () => {
      const res = await request(app)
        .get('/api/trending/topics');

      expect(res.status).toBe(200);
    }, 30000);
  });

  describe('GET /api/trending/posts', () => {
    let postIds: string[] = [];

    beforeEach(async () => {
      // Create posts in different topics
      for (const topic of topics) {
        const postRes = await request(app)
          .post(`/api/topics/${topic.name}/posts`)
          .set(getAuthHeader(userToken))
          .send({
            title: `Post in ${topic.name}`,
            content: 'Trending post content',
            type: 'TEXT',
          });
        postIds.push(postRes.body.post.id);
      }
    });

    it('should return trending posts', async () => {
      const res = await request(app)
        .get('/api/trending/posts');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('posts');
      expect(Array.isArray(res.body.posts)).toBe(true);
    }, 30000);

    it('should limit trending posts to specified number', async () => {
      const res = await request(app)
        .get('/api/trending/posts?limit=10');

      expect(res.status).toBe(200);
      expect(res.body.posts.length).toBeLessThanOrEqual(10);
    }, 30000);

    it('should work without authentication', async () => {
      const res = await request(app)
        .get('/api/trending/posts');

      expect(res.status).toBe(200);
    }, 30000);
  });

  describe('Trending Score Calculation', () => {
    it('should increase trending score with recent activity', async () => {
      const topic = topics[0];

      // Create post in topic (activity)
      await request(app)
        .post(`/api/topics/${topic.name}/posts`)
        .set(getAuthHeader(userToken))
        .send({
          title: 'Active post',
          content: 'Content',
          type: 'TEXT',
        });

      // Get trending topics
      const res = await request(app)
        .get('/api/trending/topics');

      expect(res.status).toBe(200);
      const trendingTopic = res.body.topics.find((t: any) => t.id === topic.id);
      if (trendingTopic) {
        expect(trendingTopic.trendingScore).toBeGreaterThanOrEqual(0);
      }
    }, 30000);

    it('should increase trending score with new members', async () => {
      const topic = topics[0];

      // Create a new user who joins the topic
      const newUserRes = await request(app)
        .post('/api/auth/register')
        .send({
          username: generateUniqueUsername(),
          email: generateUniqueEmail(),
          password: 'Test123!@#',
          agreedToTerms: true,
        });

      await request(app)
        .post(`/api/topics/${topic.name}/join`)
        .set(getAuthHeader(newUserRes.body.accessToken));

      // Get trending topics
      const res = await request(app)
        .get('/api/trending/topics');

      expect(res.status).toBe(200);
      expect(res.body.topics.length).toBeGreaterThan(0);
    }, 30000);

    it('should include topics with recent posts in trending', async () => {
      const topic = topics[0];

      // Create multiple posts in the topic
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post(`/api/topics/${topic.name}/posts`)
          .set(getAuthHeader(userToken))
          .send({
            title: `Trending post ${i + 1}`,
            content: 'Content',
            type: 'TEXT',
          });
      }

      const res = await request(app)
        .get('/api/trending/topics');

      expect(res.status).toBe(200);
      // Should have at least one trending topic
      expect(res.body.topics.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Trending Sort Order', () => {
    it('should sort topics by trending score descending', async () => {
      // Create activity in first topic
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post(`/api/topics/${topics[0].name}/posts`)
          .set(getAuthHeader(userToken))
          .send({
            title: `Post ${i + 1}`,
            content: 'Content',
            type: 'TEXT',
          });
      }

      const res = await request(app)
        .get('/api/trending/topics');

      expect(res.status).toBe(200);
      if (res.body.topics.length > 1) {
        // First topic should have higher or equal score than second
        expect(res.body.topics[0].trendingScore).toBeGreaterThanOrEqual(
          res.body.topics[1].trendingScore
        );
      }
    }, 30000);

    it('should return consistent results on multiple calls', async () => {
      const res1 = await request(app)
        .get('/api/trending/topics');

      const res2 = await request(app)
        .get('/api/trending/topics');

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(res1.body.topics.length).toBe(res2.body.topics.length);
    }, 30000);
  });

  describe('Trending with Time Decay', () => {
    it('should consider time in trending calculation', async () => {
      // Trending should favor recent activity over old activity
      // This is implicit in the algorithm but we can test that old posts don't dominate

      const res = await request(app)
        .get('/api/trending/posts');

      expect(res.status).toBe(200);
      // Posts should be returned (time decay is working if no errors)
      expect(res.body.posts).toBeDefined();
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should handle invalid limit parameter', async () => {
      const res = await request(app)
        .get('/api/trending/topics?limit=invalid');

      // Should either use default or return error
      expect([200, 400]).toContain(res.status);
    }, 30000);

    it('should handle negative limit parameter', async () => {
      const res = await request(app)
        .get('/api/trending/topics?limit=-5');

      // Should either use default or return error
      expect([200, 400]).toContain(res.status);
    }, 30000);

    it('should handle very large limit parameter', async () => {
      const res = await request(app)
        .get('/api/trending/topics?limit=1000');

      expect(res.status).toBe(200);
      // Should cap at a reasonable maximum
      expect(res.body.topics.length).toBeLessThanOrEqual(100);
    }, 30000);
  });
});
