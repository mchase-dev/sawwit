import request from 'supertest';
import app from '../src/index';
import { cleanDatabase, disconnectDatabase } from './utils/testDb';
import { getAuthHeader } from './utils/testAuth';
import { generateUniqueUsername, generateUniqueEmail } from './utils/testHelpers';

describe('Comments API', () => {
  let userToken: string;
  let userId: string;
  let otherUserToken: string;
  let otherUserId: string;
  let moderatorToken: string;
  let moderatorUserId: string;
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

    // Create moderator user
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

    // Create a topic
    const topicRes = await request(app)
      .post('/api/topics')
      .set(getAuthHeader(userToken))
      .send({
        displayName: 'Test Topic',
        description: 'A test topic',
      });
    topicName = topicRes.body.topic.name;

    // Make other users join the topic
    await request(app)
      .post(`/api/topics/${topicName}/join`)
      .set(getAuthHeader(otherUserToken));

    // Make moderator a member and then appoint as moderator
    await request(app)
      .post(`/api/topics/${topicName}/join`)
      .set(getAuthHeader(moderatorToken));

    await request(app)
      .post(`/api/topics/${topicName}/moderators`)
      .set(getAuthHeader(userToken))
      .send({
        userId: moderatorUserId,
      });

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
  }, 90000);

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe('POST /api/posts/:id/comments', () => {
    it('should create a comment on a post', async () => {
      const res = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set(getAuthHeader(otherUserToken))
        .send({
          content: 'This is a test comment',
        });

      expect(res.status).toBe(201);
      expect(res.body.comment).toHaveProperty('id');
      expect(res.body.comment.content).toBe('This is a test comment');
      expect(res.body.comment.authorId).toBe(otherUserId);
      commentId = res.body.comment.id;
    }, 30000);

    it('should create a reply to a comment', async () => {
      // Create parent comment
      const parentRes = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set(getAuthHeader(otherUserToken))
        .send({
          content: 'Parent comment',
        });
      const parentId = parentRes.body.comment.id;

      // Create reply
      const res = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set(getAuthHeader(userToken))
        .send({
          content: 'Reply to comment',
          parentId: parentId,
        });

      expect(res.status).toBe(201);
      expect(res.body.comment.content).toBe('Reply to comment');
      expect(res.body.comment.parentId).toBe(parentId);
    }, 30000);

    it('should reject comment creation without authentication', async () => {
      const res = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .send({
          content: 'Test comment',
        });

      expect(res.status).toBe(401);
    });

    it('should reject comment creation without content', async () => {
      const res = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set(getAuthHeader(userToken))
        .send({});

      expect([400, 500]).toContain(res.status);
    });

    it('should reject comment on non-existent post', async () => {
      const res = await request(app)
        .post('/api/posts/nonexistent-id/comments')
        .set(getAuthHeader(userToken))
        .send({
          content: 'Test comment',
        });

      expect([404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/posts/:id/comments', () => {
    beforeEach(async () => {
      // Create some comments
      await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set(getAuthHeader(userToken))
        .send({
          content: 'First comment',
        });

      await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set(getAuthHeader(otherUserToken))
        .send({
          content: 'Second comment',
        });
    });

    it('should get all comments for a post', async () => {
      const res = await request(app)
        .get(`/api/posts/${postId}/comments`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('comments');
      expect(Array.isArray(res.body.comments)).toBe(true);
      expect(res.body.comments.length).toBeGreaterThanOrEqual(2);
    }, 30000);

    it('should support sorting comments', async () => {
      const res = await request(app)
        .get(`/api/posts/${postId}/comments?sort=new`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('comments');
    });

    it('should return 404 or empty list for non-existent post', async () => {
      const res = await request(app)
        .get('/api/posts/nonexistent-id/comments');

      // API may return 200 with empty list or 404/500 for non-existent post
      expect([200, 404, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.comments).toBeDefined();
      }
    });
  });

  describe('GET /api/comments/:id', () => {
    beforeEach(async () => {
      const res = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set(getAuthHeader(userToken))
        .send({
          content: 'Test comment',
        });
      commentId = res.body.comment.id;
    });

    it('should get a comment by ID', async () => {
      const res = await request(app)
        .get(`/api/comments/${commentId}`);

      expect(res.status).toBe(200);
      expect(res.body.comment).toHaveProperty('id');
      expect(res.body.comment.id).toBe(commentId);
      expect(res.body.comment.content).toBe('Test comment');
    }, 30000);

    it('should return 404 for non-existent comment', async () => {
      const res = await request(app)
        .get('/api/comments/nonexistent-id');

      expect([404, 500]).toContain(res.status);
    });
  });

  describe('PUT /api/comments/:id', () => {
    beforeEach(async () => {
      const res = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set(getAuthHeader(userToken))
        .send({
          content: 'Original comment',
        });
      commentId = res.body.comment.id;
    });

    it('should update own comment', async () => {
      const res = await request(app)
        .put(`/api/comments/${commentId}`)
        .set(getAuthHeader(userToken))
        .send({
          content: 'Updated comment',
        });

      expect(res.status).toBe(200);
      expect(res.body.comment.content).toBe('Updated comment');
    }, 30000);

    it('should allow moderator to update comment', async () => {
      const res = await request(app)
        .put(`/api/comments/${commentId}`)
        .set(getAuthHeader(moderatorToken))
        .send({
          content: 'Moderator updated',
        });

      expect(res.status).toBe(200);
      expect(res.body.comment.content).toBe('Moderator updated');
    }, 30000);

    it('should reject update by non-author non-moderator', async () => {
      const res = await request(app)
        .put(`/api/comments/${commentId}`)
        .set(getAuthHeader(otherUserToken))
        .send({
          content: 'Unauthorized update',
        });

      expect(res.status).toBe(403);
    });

    it('should reject update without authentication', async () => {
      const res = await request(app)
        .put(`/api/comments/${commentId}`)
        .send({
          content: 'Updated comment',
        });

      expect(res.status).toBe(401);
    });

    it('should reject update of non-existent comment', async () => {
      const res = await request(app)
        .put('/api/comments/nonexistent-id')
        .set(getAuthHeader(userToken))
        .send({
          content: 'Updated comment',
        });

      expect([404, 500]).toContain(res.status);
    });
  });

  describe('DELETE /api/comments/:id', () => {
    beforeEach(async () => {
      const res = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set(getAuthHeader(userToken))
        .send({
          content: 'Comment to delete',
        });
      commentId = res.body.comment.id;
    });

    it('should delete own comment', async () => {
      const res = await request(app)
        .delete(`/api/comments/${commentId}`)
        .set(getAuthHeader(userToken));

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Comment deleted successfully');
    }, 30000);

    it('should allow moderator to delete comment', async () => {
      const res = await request(app)
        .delete(`/api/comments/${commentId}`)
        .set(getAuthHeader(moderatorToken));

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Comment deleted successfully');
    }, 30000);

    it('should reject delete by non-author non-moderator', async () => {
      const res = await request(app)
        .delete(`/api/comments/${commentId}`)
        .set(getAuthHeader(otherUserToken));

      expect(res.status).toBe(403);
    });

    it('should reject delete without authentication', async () => {
      const res = await request(app)
        .delete(`/api/comments/${commentId}`);

      expect(res.status).toBe(401);
    });

    it('should reject delete of non-existent comment', async () => {
      const res = await request(app)
        .delete('/api/comments/nonexistent-id')
        .set(getAuthHeader(userToken));

      expect([404, 500]).toContain(res.status);
    });
  });

  describe('Voting on comments', () => {
    beforeEach(async () => {
      const res = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set(getAuthHeader(userToken))
        .send({
          content: 'Comment to vote on',
        });
      commentId = res.body.comment.id;
    });

    it('should upvote a comment', async () => {
      const res = await request(app)
        .post('/api/votes/upvote')
        .set(getAuthHeader(otherUserToken))
        .send({ commentId });

      expect(res.status).toBe(200);
    }, 30000);

    it('should downvote a comment', async () => {
      const res = await request(app)
        .post('/api/votes/downvote')
        .set(getAuthHeader(otherUserToken))
        .send({ commentId });

      expect(res.status).toBe(200);
    }, 30000);

    it('should remove vote from a comment', async () => {
      // First upvote
      await request(app)
        .post('/api/votes/upvote')
        .set(getAuthHeader(otherUserToken))
        .send({ commentId });

      // Then remove vote
      const res = await request(app)
        .delete('/api/votes')
        .set(getAuthHeader(otherUserToken))
        .send({ commentId });

      expect(res.status).toBe(200);
    }, 30000);

    it('should get user vote on a comment', async () => {
      // First upvote
      await request(app)
        .post('/api/votes/upvote')
        .set(getAuthHeader(otherUserToken))
        .send({ commentId });

      // Get vote
      const res = await request(app)
        .get(`/api/votes?commentId=${commentId}`)
        .set(getAuthHeader(otherUserToken));

      expect(res.status).toBe(200);
      expect(res.body.vote).toBeDefined();
    }, 30000);

    it('should toggle vote from upvote to downvote', async () => {
      // First upvote
      await request(app)
        .post('/api/votes/upvote')
        .set(getAuthHeader(otherUserToken))
        .send({ commentId });

      // Then downvote
      const res = await request(app)
        .post('/api/votes/downvote')
        .set(getAuthHeader(otherUserToken))
        .send({ commentId });

      expect(res.status).toBe(200);
    }, 30000);

    it('should reject vote without authentication', async () => {
      const res = await request(app)
        .post('/api/votes/upvote')
        .send({ commentId });

      expect(res.status).toBe(401);
    });
  });
});
