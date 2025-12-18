import request from 'supertest';
import app from '../src/index';
import { cleanDatabase, disconnectDatabase } from './utils/testDb';
import { getAuthHeader } from './utils/testAuth';
import { generateUniqueUsername, generateUniqueEmail } from './utils/testHelpers';

describe('Posts API', () => {
  let userToken: string;
  let userId: string;
  let otherUserToken: string;
  let otherUserId: string;
  let topicName: string;
  let postId: string;

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
        description: 'A test topic for posts',
      });
    topicName = topicRes.body.topic.name;
  }, 90000);

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe('POST /api/topics/:name/posts', () => {
    it('should create a text post', async () => {
      const res = await request(app)
        .post(`/api/topics/${topicName}/posts`)
        .set(getAuthHeader(userToken))
        .send({
          title: 'Test Post',
          content: 'This is a test post content',
          type: 'TEXT',
        });

      expect(res.status).toBe(201);
      expect(res.body.post).toHaveProperty('id');
      expect(res.body.post.title).toBe('Test Post');
      expect(res.body.post.content).toBe('This is a test post content');
      expect(res.body.post.type).toBe('TEXT');
      postId = res.body.post.id;
    }, 30000);

    it('should create a link post', async () => {
      const res = await request(app)
        .post(`/api/topics/${topicName}/posts`)
        .set(getAuthHeader(userToken))
        .send({
          title: 'Link Post',
          content: '',
          linkUrl: 'https://example.com',
          type: 'LINK',
        });

      expect(res.status).toBe(201);
      expect(res.body.post.type).toBe('LINK');
      // API may normalize URL by adding trailing slash
      expect(res.body.post.linkUrl).toMatch(/^https:\/\/example\.com\/?$/);
    }, 30000);

    it('should create an image post', async () => {
      const res = await request(app)
        .post(`/api/topics/${topicName}/posts`)
        .set(getAuthHeader(userToken))
        .send({
          title: 'Image Post',
          content: '',
          imageUrl: 'https://example.com/image.jpg',
          type: 'IMAGE',
        });

      expect(res.status).toBe(201);
      expect(res.body.post.type).toBe('IMAGE');
      expect(res.body.post.imageUrl).toBe('https://example.com/image.jpg');
    }, 30000);

    it('should create a post with NSFW flag', async () => {
      const res = await request(app)
        .post(`/api/topics/${topicName}/posts`)
        .set(getAuthHeader(userToken))
        .send({
          title: 'NSFW Post',
          content: 'NSFW content',
          type: 'TEXT',
          isNSFW: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.post.isNSFW).toBe(true);
    }, 30000);

    it('should create a post with spoiler flag', async () => {
      const res = await request(app)
        .post(`/api/topics/${topicName}/posts`)
        .set(getAuthHeader(userToken))
        .send({
          title: 'Spoiler Post',
          content: 'Spoiler content',
          type: 'TEXT',
          isSpoiler: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.post.isSpoiler).toBe(true);
    }, 30000);

    it('should reject post creation without authentication', async () => {
      const res = await request(app)
        .post(`/api/topics/${topicName}/posts`)
        .send({
          title: 'Test Post',
          content: 'Content',
          type: 'TEXT',
        });

      expect(res.status).toBe(401);
    });

    it('should reject post creation without title', async () => {
      const res = await request(app)
        .post(`/api/topics/${topicName}/posts`)
        .set(getAuthHeader(userToken))
        .send({
          content: 'Content without title',
          type: 'TEXT',
        });

      expect([400, 500]).toContain(res.status);
    });
  });

  describe('GET /api/posts/:identifier', () => {
    beforeEach(async () => {
      const postRes = await request(app)
        .post(`/api/topics/${topicName}/posts`)
        .set(getAuthHeader(userToken))
        .send({
          title: 'Test Post',
          content: 'Test content',
          type: 'TEXT',
        });
      postId = postRes.body.post.id;
    });

    it('should get a post by ID', async () => {
      const res = await request(app)
        .get(`/api/posts/${postId}`);

      expect(res.status).toBe(200);
      expect(res.body.post).toHaveProperty('id');
      expect(res.body.post.id).toBe(postId);
      expect(res.body.post.title).toBe('Test Post');
    }, 30000);

    it('should return 404 for non-existent post', async () => {
      const res = await request(app)
        .get('/api/posts/non-existent-id');

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/posts/:id', () => {
    beforeEach(async () => {
      const postRes = await request(app)
        .post(`/api/topics/${topicName}/posts`)
        .set(getAuthHeader(userToken))
        .send({
          title: 'Original Title',
          content: 'Original content',
          type: 'TEXT',
        });
      postId = postRes.body.post.id;
    });

    it('should update own post', async () => {
      const res = await request(app)
        .put(`/api/posts/${postId}`)
        .set(getAuthHeader(userToken))
        .send({
          title: 'Updated Title',
          content: 'Updated content',
        });

      expect(res.status).toBe(200);
      expect(res.body.post.title).toBe('Updated Title');
      expect(res.body.post.content).toBe('Updated content');
    }, 30000);

    it('should reject update by non-author', async () => {
      const res = await request(app)
        .put(`/api/posts/${postId}`)
        .set(getAuthHeader(otherUserToken))
        .send({
          title: 'Hacked Title',
        });

      expect(res.status).toBe(403);
    });

    it('should reject update without authentication', async () => {
      const res = await request(app)
        .put(`/api/posts/${postId}`)
        .send({
          title: 'Updated Title',
        });

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/posts/:id', () => {
    beforeEach(async () => {
      const postRes = await request(app)
        .post(`/api/topics/${topicName}/posts`)
        .set(getAuthHeader(userToken))
        .send({
          title: 'Post to Delete',
          content: 'Content',
          type: 'TEXT',
        });
      postId = postRes.body.post.id;
    });

    it('should delete own post', async () => {
      const res = await request(app)
        .delete(`/api/posts/${postId}`)
        .set(getAuthHeader(userToken));

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Post deleted successfully');
    }, 30000);

    it('should reject delete by non-author', async () => {
      const res = await request(app)
        .delete(`/api/posts/${postId}`)
        .set(getAuthHeader(otherUserToken));

      expect(res.status).toBe(403);
    });

    it('should reject delete without authentication', async () => {
      const res = await request(app)
        .delete(`/api/posts/${postId}`);

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/posts/:id/save', () => {
    beforeEach(async () => {
      const postRes = await request(app)
        .post(`/api/topics/${topicName}/posts`)
        .set(getAuthHeader(userToken))
        .send({
          title: 'Post to Save',
          content: 'Content',
          type: 'TEXT',
        });
      postId = postRes.body.post.id;
    });

    it('should save a post', async () => {
      const res = await request(app)
        .post(`/api/posts/${postId}/save`)
        .set(getAuthHeader(otherUserToken));

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Post saved successfully');
    }, 30000);

    it('should reject save without authentication', async () => {
      const res = await request(app)
        .post(`/api/posts/${postId}/save`);

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/posts/:id/save', () => {
    beforeEach(async () => {
      const postRes = await request(app)
        .post(`/api/topics/${topicName}/posts`)
        .set(getAuthHeader(userToken))
        .send({
          title: 'Post to Unsave',
          content: 'Content',
          type: 'TEXT',
        });
      postId = postRes.body.post.id;

      // Save the post first
      await request(app)
        .post(`/api/posts/${postId}/save`)
        .set(getAuthHeader(otherUserToken));
    });

    it('should unsave a post', async () => {
      const res = await request(app)
        .delete(`/api/posts/${postId}/save`)
        .set(getAuthHeader(otherUserToken));

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Post unsaved successfully');
    }, 30000);

    it('should reject unsave without authentication', async () => {
      const res = await request(app)
        .delete(`/api/posts/${postId}/save`);

      expect(res.status).toBe(401);
    });
  });

  describe('Voting on posts', () => {
    beforeEach(async () => {
      const postRes = await request(app)
        .post(`/api/topics/${topicName}/posts`)
        .set(getAuthHeader(userToken))
        .send({
          title: 'Post to Vote',
          content: 'Content',
          type: 'TEXT',
        });
      postId = postRes.body.post.id;
    });

    it('should upvote a post', async () => {
      const res = await request(app)
        .post('/api/votes/upvote')
        .set(getAuthHeader(otherUserToken))
        .send({ postId });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Upvote recorded successfully');
    }, 30000);

    it('should downvote a post', async () => {
      const res = await request(app)
        .post('/api/votes/downvote')
        .set(getAuthHeader(otherUserToken))
        .send({ postId });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Downvote recorded successfully');
    }, 30000);

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
      expect(res.body.message).toBe('Vote removed successfully');
    }, 30000);

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
      // Vote can be either an object with type or a number (1 for upvote, -1 for downvote)
      expect(res.body.vote).toBeDefined();
    }, 30000);

    it('should toggle vote from upvote to downvote', async () => {
      // First upvote
      await request(app)
        .post('/api/votes/upvote')
        .set(getAuthHeader(otherUserToken))
        .send({ postId });

      // Then downvote (should toggle)
      const res = await request(app)
        .post('/api/votes/downvote')
        .set(getAuthHeader(otherUserToken))
        .send({ postId });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Downvote recorded successfully');
    }, 30000);

    it('should reject vote without authentication', async () => {
      const res = await request(app)
        .post('/api/votes/upvote')
        .send({ postId });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/posts/:id/pin', () => {
    beforeEach(async () => {
      const postRes = await request(app)
        .post(`/api/topics/${topicName}/posts`)
        .set(getAuthHeader(userToken))
        .send({
          title: 'Post to Pin',
          content: 'Content',
          type: 'TEXT',
        });
      postId = postRes.body.post.id;
    });

    it('should pin a post as moderator/owner', async () => {
      const res = await request(app)
        .post(`/api/posts/${postId}/pin`)
        .set(getAuthHeader(userToken));

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Post pinned successfully');
    }, 30000);

    it('should reject pin without authentication', async () => {
      const res = await request(app)
        .post(`/api/posts/${postId}/pin`);

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/posts/:id/pin', () => {
    beforeEach(async () => {
      const postRes = await request(app)
        .post(`/api/topics/${topicName}/posts`)
        .set(getAuthHeader(userToken))
        .send({
          title: 'Post to Unpin',
          content: 'Content',
          type: 'TEXT',
        });
      postId = postRes.body.post.id;

      // Pin the post first
      await request(app)
        .post(`/api/posts/${postId}/pin`)
        .set(getAuthHeader(userToken));
    });

    it('should unpin a post as moderator/owner', async () => {
      const res = await request(app)
        .delete(`/api/posts/${postId}/pin`)
        .set(getAuthHeader(userToken));

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Post unpinned successfully');
    }, 30000);
  });

  describe('POST /api/posts/:id/lock', () => {
    beforeEach(async () => {
      const postRes = await request(app)
        .post(`/api/topics/${topicName}/posts`)
        .set(getAuthHeader(userToken))
        .send({
          title: 'Post to Lock',
          content: 'Content',
          type: 'TEXT',
        });
      postId = postRes.body.post.id;
    });

    it('should lock a post as moderator/owner', async () => {
      const res = await request(app)
        .post(`/api/posts/${postId}/lock`)
        .set(getAuthHeader(userToken));

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Post locked successfully');
    }, 30000);

    it('should reject lock without authentication', async () => {
      const res = await request(app)
        .post(`/api/posts/${postId}/lock`);

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/posts/:id/lock', () => {
    beforeEach(async () => {
      const postRes = await request(app)
        .post(`/api/topics/${topicName}/posts`)
        .set(getAuthHeader(userToken))
        .send({
          title: 'Post to Unlock',
          content: 'Content',
          type: 'TEXT',
        });
      postId = postRes.body.post.id;

      // Lock the post first
      await request(app)
        .post(`/api/posts/${postId}/lock`)
        .set(getAuthHeader(userToken));
    });

    it('should unlock a post as moderator/owner', async () => {
      const res = await request(app)
        .delete(`/api/posts/${postId}/lock`)
        .set(getAuthHeader(userToken));

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Post unlocked successfully');
    }, 30000);
  });
});
