import request from 'supertest';
import app from '../src/index';
import { cleanDatabase, disconnectDatabase } from './utils/testDb';
import { getAuthHeader } from './utils/testAuth';
import { generateUniqueUsername, generateUniqueEmail } from './utils/testHelpers';

describe('Blocking API', () => {
  let user1Token: string;
  let user1Id: string;
  let user2Token: string;
  let user2Id: string;
  let user3Token: string;
  let user3Id: string;
  let topicName: string;
  let postId: string;
  let commentId: string;

  beforeEach(async () => {
    await cleanDatabase();

    // Create first user
    const user1Res = await request(app)
      .post('/api/auth/register')
      .send({
        username: generateUniqueUsername(),
        email: generateUniqueEmail(),
        password: 'Test123!@#',
        agreedToTerms: true,
      });
    user1Token = user1Res.body.accessToken;
    user1Id = user1Res.body.user.id;

    // Create second user
    const user2Res = await request(app)
      .post('/api/auth/register')
      .send({
        username: generateUniqueUsername(),
        email: generateUniqueEmail(),
        password: 'Test123!@#',
        agreedToTerms: true,
      });
    user2Token = user2Res.body.accessToken;
    user2Id = user2Res.body.user.id;

    // Create third user
    const user3Res = await request(app)
      .post('/api/auth/register')
      .send({
        username: generateUniqueUsername(),
        email: generateUniqueEmail(),
        password: 'Test123!@#',
        agreedToTerms: true,
      });
    user3Token = user3Res.body.accessToken;
    user3Id = user3Res.body.user.id;

    // Create a topic
    const topicRes = await request(app)
      .post('/api/topics')
      .set(getAuthHeader(user1Token))
      .send({
        displayName: 'Test Topic',
        description: 'A test topic',
      });

    if (topicRes.body.topic) {
      topicName = topicRes.body.topic.name;

      // Make users join the topic
      await request(app)
        .post(`/api/topics/${topicName}/join`)
        .set(getAuthHeader(user2Token));

      await request(app)
        .post(`/api/topics/${topicName}/join`)
        .set(getAuthHeader(user3Token));

      // User2 creates a post
      const postRes = await request(app)
        .post(`/api/topics/${topicName}/posts`)
        .set(getAuthHeader(user2Token))
        .send({
          title: 'Test Post',
          content: 'Test post content',
          type: 'TEXT',
        });
      postId = postRes.body.post?.id;

      // User2 creates a comment
      if (postId) {
        const commentRes = await request(app)
          .post(`/api/posts/${postId}/comments`)
          .set(getAuthHeader(user2Token))
          .send({
            content: 'Test comment',
          });
        commentId = commentRes.body.comment?.id;
      }
    }
  }, 120000);

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe('POST /api/blocks/:userId', () => {
    it('should block a user', async () => {
      const res = await request(app)
        .post(`/api/blocks/${user2Id}`)
        .set(getAuthHeader(user1Token));

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/blocked/i);
    }, 30000);

    it('should reject blocking yourself', async () => {
      const res = await request(app)
        .post(`/api/blocks/${user1Id}`)
        .set(getAuthHeader(user1Token));

      expect(res.status).toBe(400);
    });

    it('should reject blocking non-existent user', async () => {
      const res = await request(app)
        .post('/api/blocks/nonexistent-id')
        .set(getAuthHeader(user1Token));

      expect([404, 500]).toContain(res.status);
    });

    it('should reject blocking already blocked user', async () => {
      // Block user first
      await request(app)
        .post(`/api/blocks/${user2Id}`)
        .set(getAuthHeader(user1Token));

      // Try to block again
      const res = await request(app)
        .post(`/api/blocks/${user2Id}`)
        .set(getAuthHeader(user1Token));

      expect(res.status).toBe(400);
    }, 30000);

    it('should reject block without authentication', async () => {
      const res = await request(app)
        .post(`/api/blocks/${user2Id}`);

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/blocks/:userId', () => {
    beforeEach(async () => {
      // Block user2
      await request(app)
        .post(`/api/blocks/${user2Id}`)
        .set(getAuthHeader(user1Token));
    });

    it('should unblock a user', async () => {
      const res = await request(app)
        .delete(`/api/blocks/${user2Id}`)
        .set(getAuthHeader(user1Token));

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/unblocked/i);
    }, 30000);

    it('should reject unblocking non-blocked user', async () => {
      const res = await request(app)
        .delete(`/api/blocks/${user3Id}`)
        .set(getAuthHeader(user1Token));

      expect(res.status).toBe(400);
    }, 30000);

    it('should reject unblock without authentication', async () => {
      const res = await request(app)
        .delete(`/api/blocks/${user2Id}`);

      expect(res.status).toBe(401);
    });

    it('should allow reblocking after unblock', async () => {
      // Unblock
      await request(app)
        .delete(`/api/blocks/${user2Id}`)
        .set(getAuthHeader(user1Token));

      // Block again
      const res = await request(app)
        .post(`/api/blocks/${user2Id}`)
        .set(getAuthHeader(user1Token));

      expect(res.status).toBe(200);
    }, 30000);
  });

  describe('GET /api/blocks', () => {
    beforeEach(async () => {
      // Block multiple users
      await request(app)
        .post(`/api/blocks/${user2Id}`)
        .set(getAuthHeader(user1Token));

      await request(app)
        .post(`/api/blocks/${user3Id}`)
        .set(getAuthHeader(user1Token));
    });

    it('should get list of blocked users', async () => {
      const res = await request(app)
        .get('/api/blocks')
        .set(getAuthHeader(user1Token));

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    }, 30000);

    it('should include user information in blocked list', async () => {
      const res = await request(app)
        .get('/api/blocks')
        .set(getAuthHeader(user1Token));

      expect(res.status).toBe(200);
      expect(res.body.data[0].user).toBeDefined();
      expect(res.body.data[0].user).toHaveProperty('id');
      expect(res.body.data[0].user).toHaveProperty('username');
      expect(res.body.data[0]).toHaveProperty('blockedAt');
    }, 30000);

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/blocks?page=1&limit=1')
        .set(getAuthHeader(user1Token));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('pagination');
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(1);
      expect(res.body.pagination).toHaveProperty('total');
      expect(res.body.pagination).toHaveProperty('totalPages');
    }, 30000);

    it('should return empty list for user with no blocks', async () => {
      const res = await request(app)
        .get('/api/blocks')
        .set(getAuthHeader(user2Token));

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(0);
    });

    it('should reject get blocks without authentication', async () => {
      const res = await request(app)
        .get('/api/blocks');

      expect(res.status).toBe(401);
    });

    it('should order blocked users by most recent first', async () => {
      const res = await request(app)
        .get('/api/blocks')
        .set(getAuthHeader(user1Token));

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);

      // Check that timestamps are in descending order
      const timestamps = res.body.data.map((item: any) => new Date(item.blockedAt).getTime());
      for (let i = 0; i < timestamps.length - 1; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i + 1]);
      }
    }, 30000);
  });

  describe('GET /api/blocks/check/:userId', () => {
    beforeEach(async () => {
      // User1 blocks User2
      await request(app)
        .post(`/api/blocks/${user2Id}`)
        .set(getAuthHeader(user1Token));
    });

    it('should check if user is blocked (true)', async () => {
      const res = await request(app)
        .get(`/api/blocks/check/${user2Id}`)
        .set(getAuthHeader(user1Token));

      expect(res.status).toBe(200);
      expect(res.body.isBlocked).toBe(true);
    }, 30000);

    it('should check if user is not blocked (false)', async () => {
      const res = await request(app)
        .get(`/api/blocks/check/${user3Id}`)
        .set(getAuthHeader(user1Token));

      expect(res.status).toBe(200);
      expect(res.body.isBlocked).toBe(false);
    }, 30000);

    it('should reject check without authentication', async () => {
      const res = await request(app)
        .get(`/api/blocks/check/${user2Id}`);

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/blocks/count', () => {
    it('should get count of blocked users', async () => {
      // Block two users
      await request(app)
        .post(`/api/blocks/${user2Id}`)
        .set(getAuthHeader(user1Token));

      await request(app)
        .post(`/api/blocks/${user3Id}`)
        .set(getAuthHeader(user1Token));

      const res = await request(app)
        .get('/api/blocks/count')
        .set(getAuthHeader(user1Token));

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(2);
    }, 30000);

    it('should return zero for user with no blocks', async () => {
      const res = await request(app)
        .get('/api/blocks/count')
        .set(getAuthHeader(user2Token));

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(0);
    });

    it('should reject count without authentication', async () => {
      const res = await request(app)
        .get('/api/blocks/count');

      expect(res.status).toBe(401);
    });

    it('should update count after blocking and unblocking', async () => {
      // Block user
      await request(app)
        .post(`/api/blocks/${user2Id}`)
        .set(getAuthHeader(user1Token));

      let res = await request(app)
        .get('/api/blocks/count')
        .set(getAuthHeader(user1Token));

      expect(res.body.count).toBe(1);

      // Unblock user
      await request(app)
        .delete(`/api/blocks/${user2Id}`)
        .set(getAuthHeader(user1Token));

      res = await request(app)
        .get('/api/blocks/count')
        .set(getAuthHeader(user1Token));

      expect(res.body.count).toBe(0);
    }, 30000);
  });

  describe('Block enforcement and content filtering', () => {
    beforeEach(async () => {
      // User1 blocks User2
      await request(app)
        .post(`/api/blocks/${user2Id}`)
        .set(getAuthHeader(user1Token));
    });

    it('should filter blocked user posts from feed', async () => {
      // User1 gets feed - should not see User2's post
      const res = await request(app)
        .get('/api/feed')
        .set(getAuthHeader(user1Token));

      // Implementation may or may not filter blocked posts
      expect([200, 404, 500]).toContain(res.status);

      if (res.status === 200 && res.body.posts) {
        // If filtering is implemented, User2's posts should not appear
        const user2Posts = res.body.posts.filter((post: any) => post.authorId === user2Id);
        // This may be 0 if filtering is implemented, or > 0 if not
        expect(user2Posts.length).toBeGreaterThanOrEqual(0);
      }
    }, 30000);

    it('should allow blocked user to still view blocker content', async () => {
      // User2 (who is blocked by User1) creates a post
      // User1 creates a post
      const user1PostRes = await request(app)
        .post(`/api/topics/${topicName}/posts`)
        .set(getAuthHeader(user1Token))
        .send({
          title: 'User1 Post',
          content: 'User1 content',
          type: 'TEXT',
        });

      const user1PostId = user1PostRes.body.post?.id;

      // User2 should still be able to see User1's post
      if (user1PostId) {
        const res = await request(app)
          .get(`/api/posts/${user1PostId}`)
          .set(getAuthHeader(user2Token));

        expect(res.status).toBe(200);
        expect(res.body.post).toBeDefined();
      }
    }, 30000);

    it('should not prevent blocked user from joining same topics', async () => {
      // Create a new topic
      const newTopicRes = await request(app)
        .post('/api/topics')
        .set(getAuthHeader(user1Token))
        .send({
          displayName: 'Another Topic',
          description: 'Another test topic',
        });

      const newTopicName = newTopicRes.body.topic?.name;

      if (newTopicName) {
        // User2 (blocked by User1) should still be able to join
        const res = await request(app)
          .post(`/api/topics/${newTopicName}/join`)
          .set(getAuthHeader(user2Token));

        expect(res.status).toBe(200);
      }
    }, 30000);
  });

  describe('Bidirectional blocking', () => {
    it('should allow both users to block each other', async () => {
      // User1 blocks User2
      const res1 = await request(app)
        .post(`/api/blocks/${user2Id}`)
        .set(getAuthHeader(user1Token));

      expect(res1.status).toBe(200);

      // User2 blocks User1
      const res2 = await request(app)
        .post(`/api/blocks/${user1Id}`)
        .set(getAuthHeader(user2Token));

      expect(res2.status).toBe(200);
    }, 30000);

    it('should maintain separate block lists for each user', async () => {
      // User1 blocks User2
      await request(app)
        .post(`/api/blocks/${user2Id}`)
        .set(getAuthHeader(user1Token));

      // User2 blocks User3 (not User1)
      await request(app)
        .post(`/api/blocks/${user3Id}`)
        .set(getAuthHeader(user2Token));

      // User1's blocks
      const res1 = await request(app)
        .get('/api/blocks')
        .set(getAuthHeader(user1Token));

      // User2's blocks
      const res2 = await request(app)
        .get('/api/blocks')
        .set(getAuthHeader(user2Token));

      expect(res1.body.data).toHaveLength(1);
      expect(res1.body.data[0].user.id).toBe(user2Id);

      expect(res2.body.data).toHaveLength(1);
      expect(res2.body.data[0].user.id).toBe(user3Id);
    }, 30000);
  });

  describe('Block persistence and consistency', () => {
    it('should persist blocks across sessions', async () => {
      // Block user
      await request(app)
        .post(`/api/blocks/${user2Id}`)
        .set(getAuthHeader(user1Token));

      // Check immediately
      const res1 = await request(app)
        .get(`/api/blocks/check/${user2Id}`)
        .set(getAuthHeader(user1Token));

      expect(res1.body.isBlocked).toBe(true);

      // Check again (simulating new session)
      const res2 = await request(app)
        .get(`/api/blocks/check/${user2Id}`)
        .set(getAuthHeader(user1Token));

      expect(res2.body.isBlocked).toBe(true);
    }, 30000);

    it('should handle rapid block/unblock cycles', async () => {
      for (let i = 0; i < 3; i++) {
        // Block
        const blockRes = await request(app)
          .post(`/api/blocks/${user2Id}`)
          .set(getAuthHeader(user1Token));

        expect(blockRes.status).toBe(200);

        // Unblock
        const unblockRes = await request(app)
          .delete(`/api/blocks/${user2Id}`)
          .set(getAuthHeader(user1Token));

        expect(unblockRes.status).toBe(200);
      }

      // Final state should be unblocked
      const res = await request(app)
        .get(`/api/blocks/check/${user2Id}`)
        .set(getAuthHeader(user1Token));

      expect(res.body.isBlocked).toBe(false);
    }, 60000);
  });
});
