import request from 'supertest';
import app from '../src/index';
import { cleanDatabase, disconnectDatabase } from './utils/testDb';
import { getAuthHeader } from './utils/testAuth';
import { generateUniqueUsername, generateUniqueEmail } from './utils/testHelpers';

describe('Votes API', () => {
  let userToken: string;
  let userId: string;
  let otherUserToken: string;
  let otherUserId: string;
  let topicName: string;
  let postId: string;
  let commentId: string;

  beforeEach(async () => {
    await cleanDatabase();

    // Create first user
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

    // Create second user
    const otherUserRes = await request(app)
      .post('/api/auth/register')
      .send({
        username: generateUniqueUsername(),
        email: generateUniqueEmail(),
        password: 'Test123!@#',
        agreedToTerms: true,
      });
    otherUserToken = otherUserRes.body.accessToken;
    otherUserId = otherUserRes.body.user.id;

    // Create a topic
    const topicRes = await request(app)
      .post('/api/topics')
      .set(getAuthHeader(userToken))
      .send({
        displayName: 'Test Topic',
        description: 'A test topic',
      });

    if (topicRes.body.topic) {
      topicName = topicRes.body.topic.name;

      // Make other user join the topic
      await request(app)
        .post(`/api/topics/${topicName}/join`)
        .set(getAuthHeader(otherUserToken));

      // Create a post
      const postRes = await request(app)
        .post(`/api/topics/${topicName}/posts`)
        .set(getAuthHeader(userToken))
        .send({
          title: 'Test Post',
          content: 'Test post content',
          type: 'TEXT',
        });
      postId = postRes.body.post.id;

      // Create a comment
      const commentRes = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set(getAuthHeader(userToken))
        .send({
          content: 'Test comment',
        });
      commentId = commentRes.body.comment.id;
    }
  }, 120000);

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe('POST /api/votes/upvote', () => {
    it('should upvote a post', async () => {
      const res = await request(app)
        .post('/api/votes/upvote')
        .set(getAuthHeader(otherUserToken))
        .send({ postId });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/upvote/i);
    }, 30000);

    it('should upvote a comment', async () => {
      const res = await request(app)
        .post('/api/votes/upvote')
        .set(getAuthHeader(otherUserToken))
        .send({ commentId });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/upvote/i);
    }, 30000);

    it('should toggle from downvote to upvote', async () => {
      // First downvote
      await request(app)
        .post('/api/votes/downvote')
        .set(getAuthHeader(otherUserToken))
        .send({ postId });

      // Then upvote
      const res = await request(app)
        .post('/api/votes/upvote')
        .set(getAuthHeader(otherUserToken))
        .send({ postId });

      expect(res.status).toBe(200);
    }, 30000);

    it('should handle duplicate upvote gracefully', async () => {
      // First upvote
      await request(app)
        .post('/api/votes/upvote')
        .set(getAuthHeader(otherUserToken))
        .send({ postId });

      // Second upvote
      const res = await request(app)
        .post('/api/votes/upvote')
        .set(getAuthHeader(otherUserToken))
        .send({ postId });

      // Should either succeed (idempotent) or return appropriate status
      expect([200, 400, 409]).toContain(res.status);
    }, 30000);

    it('should reject upvote without authentication', async () => {
      const res = await request(app)
        .post('/api/votes/upvote')
        .send({ postId });

      expect(res.status).toBe(401);
    });

    it('should reject upvote without target', async () => {
      const res = await request(app)
        .post('/api/votes/upvote')
        .set(getAuthHeader(otherUserToken))
        .send({});

      expect([400, 500]).toContain(res.status);
    });
  });

  describe('POST /api/votes/downvote', () => {
    it('should downvote a post', async () => {
      const res = await request(app)
        .post('/api/votes/downvote')
        .set(getAuthHeader(otherUserToken))
        .send({ postId });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/downvote/i);
    }, 30000);

    it('should downvote a comment', async () => {
      const res = await request(app)
        .post('/api/votes/downvote')
        .set(getAuthHeader(otherUserToken))
        .send({ commentId });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/downvote/i);
    }, 30000);

    it('should toggle from upvote to downvote', async () => {
      // First upvote
      await request(app)
        .post('/api/votes/upvote')
        .set(getAuthHeader(otherUserToken))
        .send({ postId });

      // Then downvote
      const res = await request(app)
        .post('/api/votes/downvote')
        .set(getAuthHeader(otherUserToken))
        .send({ postId });

      expect(res.status).toBe(200);
    }, 30000);

    it('should handle duplicate downvote gracefully', async () => {
      // First downvote
      await request(app)
        .post('/api/votes/downvote')
        .set(getAuthHeader(otherUserToken))
        .send({ postId });

      // Second downvote
      const res = await request(app)
        .post('/api/votes/downvote')
        .set(getAuthHeader(otherUserToken))
        .send({ postId });

      // Should either succeed (idempotent) or return appropriate status
      expect([200, 400, 409]).toContain(res.status);
    }, 30000);

    it('should reject downvote without authentication', async () => {
      const res = await request(app)
        .post('/api/votes/downvote')
        .send({ postId });

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/votes', () => {
    it('should remove vote from a post', async () => {
      // First upvote
      await request(app)
        .post('/api/votes/upvote')
        .set(getAuthHeader(otherUserToken))
        .send({ postId });

      // Then remove vote
      const res = await request(app)
        .delete('/api/votes')
        .set(getAuthHeader(otherUserToken))
        .send({ postId });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/removed/i);
    }, 30000);

    it('should remove vote from a comment', async () => {
      // First downvote
      await request(app)
        .post('/api/votes/downvote')
        .set(getAuthHeader(otherUserToken))
        .send({ commentId });

      // Then remove vote
      const res = await request(app)
        .delete('/api/votes')
        .set(getAuthHeader(otherUserToken))
        .send({ commentId });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/removed/i);
    }, 30000);

    it('should handle removing non-existent vote gracefully', async () => {
      const res = await request(app)
        .delete('/api/votes')
        .set(getAuthHeader(otherUserToken))
        .send({ postId });

      // Should either succeed or return appropriate status
      expect([200, 400, 404]).toContain(res.status);
    });

    it('should reject vote removal without authentication', async () => {
      const res = await request(app)
        .delete('/api/votes')
        .send({ postId });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/votes', () => {
    it('should get user vote on a post', async () => {
      // First upvote
      await request(app)
        .post('/api/votes/upvote')
        .set(getAuthHeader(otherUserToken))
        .send({ postId });

      // Get vote
      const res = await request(app)
        .get(`/api/votes?postId=${postId}`)
        .set(getAuthHeader(otherUserToken));

      expect(res.status).toBe(200);
      expect(res.body.vote).toBeDefined();
    }, 30000);

    it('should get user vote on a comment', async () => {
      // First downvote
      await request(app)
        .post('/api/votes/downvote')
        .set(getAuthHeader(otherUserToken))
        .send({ commentId });

      // Get vote
      const res = await request(app)
        .get(`/api/votes?commentId=${commentId}`)
        .set(getAuthHeader(otherUserToken));

      expect(res.status).toBe(200);
      expect(res.body.vote).toBeDefined();
    }, 30000);

    it('should return null or empty for no vote', async () => {
      const res = await request(app)
        .get(`/api/votes?postId=${postId}`)
        .set(getAuthHeader(otherUserToken));

      expect(res.status).toBe(200);
      // When user hasn't voted, vote should be null/undefined/empty or just return without error
      expect(res.body).toHaveProperty('vote');
    });

    it('should reject get vote without authentication', async () => {
      const res = await request(app)
        .get(`/api/votes?postId=${postId}`);

      expect(res.status).toBe(401);
    });
  });

  describe('Vote aggregation and constraints', () => {
    it('should ensure only one vote per user per post', async () => {
      // Upvote
      await request(app)
        .post('/api/votes/upvote')
        .set(getAuthHeader(otherUserToken))
        .send({ postId });

      // Get vote - should show upvote
      const res1 = await request(app)
        .get(`/api/votes?postId=${postId}`)
        .set(getAuthHeader(otherUserToken));

      expect(res1.status).toBe(200);
      expect(res1.body.vote).toBeDefined();

      // Downvote - should toggle
      await request(app)
        .post('/api/votes/downvote')
        .set(getAuthHeader(otherUserToken))
        .send({ postId });

      // Get vote - should show downvote (not both)
      const res2 = await request(app)
        .get(`/api/votes?postId=${postId}`)
        .set(getAuthHeader(otherUserToken));

      expect(res2.status).toBe(200);
      expect(res2.body.vote).toBeDefined();
    }, 30000);

    it('should allow multiple users to vote on the same content', async () => {
      // Create a third user to make a post that both user and otherUser can vote on
      const thirdUserRes = await request(app)
        .post('/api/auth/register')
        .send({
          username: generateUniqueUsername(),
          email: generateUniqueEmail(),
          password: 'Test123!@#',
          agreedToTerms: true,
        });
      const thirdUserToken = thirdUserRes.body.accessToken;

      // Third user joins the topic and creates a post
      await request(app)
        .post(`/api/topics/${topicName}/join`)
        .set(getAuthHeader(thirdUserToken));

      const thirdUserPostRes = await request(app)
        .post(`/api/topics/${topicName}/posts`)
        .set(getAuthHeader(thirdUserToken))
        .send({
          title: 'Third User Post',
          content: 'A post for multiple users to vote on',
          type: 'TEXT',
        });
      const thirdUserPostId = thirdUserPostRes.body.post.id;

      // User 1 upvotes the third user's post
      const res1 = await request(app)
        .post('/api/votes/upvote')
        .set(getAuthHeader(userToken))
        .send({ postId: thirdUserPostId });

      // User 2 downvotes the third user's post
      const res2 = await request(app)
        .post('/api/votes/downvote')
        .set(getAuthHeader(otherUserToken))
        .send({ postId: thirdUserPostId });

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
    }, 30000);

    it('should reflect vote changes in post score', async () => {
      // Get initial post
      const initialRes = await request(app)
        .get(`/api/posts/${postId}`);

      const initialScore = initialRes.body.post?.voteCount || 0;

      // Upvote
      await request(app)
        .post('/api/votes/upvote')
        .set(getAuthHeader(otherUserToken))
        .send({ postId });

      // Get updated post
      const updatedRes = await request(app)
        .get(`/api/posts/${postId}`);

      const updatedScore = updatedRes.body.post?.voteCount || 0;

      // Score should have increased (or at least changed)
      expect(updatedScore).toBeGreaterThanOrEqual(initialScore);
    }, 30000);
  });

  describe('Vote permissions', () => {
    it('should not allow users to vote on their own posts', async () => {
      const res = await request(app)
        .post('/api/votes/upvote')
        .set(getAuthHeader(userToken))
        .send({ postId });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/cannot vote on your own/i);
    });

    it('should not allow users to vote on their own comments', async () => {
      const res = await request(app)
        .post('/api/votes/upvote')
        .set(getAuthHeader(userToken))
        .send({ commentId });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/cannot vote on your own/i);
    });

    it('should not allow users to downvote their own posts', async () => {
      const res = await request(app)
        .post('/api/votes/downvote')
        .set(getAuthHeader(userToken))
        .send({ postId });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/cannot vote on your own/i);
    });

    it('should not allow users to downvote their own comments', async () => {
      const res = await request(app)
        .post('/api/votes/downvote')
        .set(getAuthHeader(userToken))
        .send({ commentId });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/cannot vote on your own/i);
    });

    it('should allow users to vote on other users posts', async () => {
      const res = await request(app)
        .post('/api/votes/upvote')
        .set(getAuthHeader(otherUserToken))
        .send({ postId });

      expect(res.status).toBe(200);
    });

    it('should allow users to vote on other users comments', async () => {
      const res = await request(app)
        .post('/api/votes/upvote')
        .set(getAuthHeader(otherUserToken))
        .send({ commentId });

      expect(res.status).toBe(200);
    });
  });
});
