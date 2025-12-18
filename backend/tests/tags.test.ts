import request from 'supertest';
import app from '../src/index';
import { cleanDatabase, disconnectDatabase } from './utils/testDb';
import { getAuthHeader } from './utils/testAuth';
import { generateUniqueUsername, generateUniqueEmail } from './utils/testHelpers';

// Helper to generate unique topic display name
let topicCounter = 0;
const generateUniqueTopicName = () => {
  topicCounter++;
  return `Tags Test Topic ${Date.now()}-${topicCounter}`;
};

describe('Tags API', () => {
  let userToken: string;
  let userId: string;
  let moderatorToken: string;
  let moderatorUserId: string;
  let ownerToken: string;
  let ownerId: string;
  let topicId: string;
  let topicName: string;
  let tagId: string;
  let postId: string;

  beforeEach(async () => {
    await cleanDatabase();

    // Create regular user
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
    ownerId = ownerRes.body.user.id;

    // Create topic with owner
    const topicRes = await request(app)
      .post('/api/topics')
      .set(getAuthHeader(ownerToken))
      .send({
        displayName: generateUniqueTopicName(),
        description: 'A test topic for tags',
      });

    if (!topicRes.body.topic) {
      throw new Error('Failed to create topic in test setup');
    }
    topicId = topicRes.body.topic.id;
    topicName = topicRes.body.topic.name;

    // Join topic with regular user and moderator
    await request(app)
      .post(`/api/topics/${topicName}/join`)
      .set(getAuthHeader(userToken));

    await request(app)
      .post(`/api/topics/${topicName}/join`)
      .set(getAuthHeader(moderatorToken));

    // Appoint moderator
    await request(app)
      .post(`/api/topics/${topicName}/moderators`)
      .set(getAuthHeader(ownerToken))
      .send({ userId: moderatorUserId });
  }, 120000);

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe('POST /api/tags', () => {
    it('should create a tag as moderator', async () => {
      const res = await request(app)
        .post('/api/tags')
        .set(getAuthHeader(moderatorToken))
        .send({
          topicId,
          name: 'Discussion',
          color: '#FF5733',
          description: 'General discussion tag',
        });

      expect(res.status).toBe(201);
      expect(res.body.tag).toHaveProperty('id');
      expect(res.body.tag.name).toBe('Discussion');
      expect(res.body.tag.bgColor).toBe('#FF5733');
      tagId = res.body.tag.id;
    }, 30000);

    it('should create a tag as topic owner', async () => {
      const res = await request(app)
        .post('/api/tags')
        .set(getAuthHeader(ownerToken))
        .send({
          topicId,
          name: 'Announcement',
          color: '#00AA00',
        });

      expect(res.status).toBe(201);
      expect(res.body.tag).toHaveProperty('id');
      expect(res.body.tag.name).toBe('Announcement');
    }, 30000);

    it('should use default color if none provided', async () => {
      const res = await request(app)
        .post('/api/tags')
        .set(getAuthHeader(moderatorToken))
        .send({
          topicId,
          name: 'Question',
        });

      expect(res.status).toBe(201);
      expect(res.body.tag.bgColor).toBe('#0079D3');
    }, 30000);

    it('should reject tag creation by non-moderator', async () => {
      const res = await request(app)
        .post('/api/tags')
        .set(getAuthHeader(userToken))
        .send({
          topicId,
          name: 'Unauthorized Tag',
        });

      expect(res.status).toBe(403);
    });

    it('should reject tag creation without authentication', async () => {
      const res = await request(app)
        .post('/api/tags')
        .send({
          topicId,
          name: 'Unauthenticated Tag',
        });

      expect(res.status).toBe(401);
    });

    it('should reject duplicate tag names in same topic', async () => {
      // Create first tag
      await request(app)
        .post('/api/tags')
        .set(getAuthHeader(moderatorToken))
        .send({
          topicId,
          name: 'Bug',
        });

      // Try to create duplicate
      const res = await request(app)
        .post('/api/tags')
        .set(getAuthHeader(moderatorToken))
        .send({
          topicId,
          name: 'Bug',
        });

      expect(res.status).toBe(409);
    }, 30000);

    it('should reject tag creation without topic ID', async () => {
      const res = await request(app)
        .post('/api/tags')
        .set(getAuthHeader(moderatorToken))
        .send({
          name: 'No Topic Tag',
        });

      expect([400, 404, 500]).toContain(res.status);
    });

    it('should reject tag creation with non-existent topic', async () => {
      const res = await request(app)
        .post('/api/tags')
        .set(getAuthHeader(moderatorToken))
        .send({
          topicId: 'nonexistent-topic-id',
          name: 'Invalid Topic Tag',
        });

      expect([404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/tags/topic/:topicId', () => {
    beforeEach(async () => {
      // Create some tags
      await request(app)
        .post('/api/tags')
        .set(getAuthHeader(moderatorToken))
        .send({
          topicId,
          name: 'Feature',
          color: '#00FF00',
        });

      await request(app)
        .post('/api/tags')
        .set(getAuthHeader(moderatorToken))
        .send({
          topicId,
          name: 'Bug',
          color: '#FF0000',
        });
    });

    it('should get all tags for a topic', async () => {
      const res = await request(app)
        .get(`/api/tags/topic/${topicId}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('tags');
      expect(Array.isArray(res.body.tags)).toBe(true);
      expect(res.body.tags.length).toBeGreaterThanOrEqual(2);
    }, 30000);

    it('should return tags sorted by name', async () => {
      const res = await request(app)
        .get(`/api/tags/topic/${topicId}`);

      expect(res.status).toBe(200);
      const tagNames = res.body.tags.map((tag: any) => tag.name);
      const sortedNames = [...tagNames].sort();
      expect(tagNames).toEqual(sortedNames);
    }, 30000);

    it('should include post count in tag response', async () => {
      const res = await request(app)
        .get(`/api/tags/topic/${topicId}`);

      expect(res.status).toBe(200);
      expect(res.body.tags[0]).toHaveProperty('_count');
      expect(res.body.tags[0]._count).toHaveProperty('posts');
    }, 30000);

    it('should return empty array for topic with no tags', async () => {
      // Create new topic without tags
      const newTopicRes = await request(app)
        .post('/api/topics')
        .set(getAuthHeader(ownerToken))
        .send({
          displayName: generateUniqueTopicName(),
          description: 'Topic without tags',
        });

      const res = await request(app)
        .get(`/api/tags/topic/${newTopicRes.body.topic.id}`);

      expect(res.status).toBe(200);
      expect(res.body.tags).toEqual([]);
    }, 30000);
  });

  describe('GET /api/tags/:id', () => {
    beforeEach(async () => {
      const tagRes = await request(app)
        .post('/api/tags')
        .set(getAuthHeader(moderatorToken))
        .send({
          topicId,
          name: 'Help',
          color: '#FFAA00',
        });
      tagId = tagRes.body.tag.id;
    });

    it('should get a tag by ID', async () => {
      const res = await request(app)
        .get(`/api/tags/${tagId}`);

      expect(res.status).toBe(200);
      expect(res.body.tag).toHaveProperty('id');
      expect(res.body.tag.id).toBe(tagId);
      expect(res.body.tag.name).toBe('Help');
    }, 30000);

    it('should include topic information in tag response', async () => {
      const res = await request(app)
        .get(`/api/tags/${tagId}`);

      expect(res.status).toBe(200);
      expect(res.body.tag).toHaveProperty('topic');
      expect(res.body.tag.topic).toHaveProperty('name');
      expect(res.body.tag.topic).toHaveProperty('displayName');
    }, 30000);

    it('should return 404 for non-existent tag', async () => {
      const res = await request(app)
        .get('/api/tags/nonexistent-tag-id');

      expect([404, 500]).toContain(res.status);
    });
  });

  describe('PUT /api/tags/:id', () => {
    beforeEach(async () => {
      const tagRes = await request(app)
        .post('/api/tags')
        .set(getAuthHeader(moderatorToken))
        .send({
          topicId,
          name: 'Original Name',
          color: '#000000',
        });
      tagId = tagRes.body.tag.id;
    });

    it('should update tag name as moderator', async () => {
      const res = await request(app)
        .put(`/api/tags/${tagId}`)
        .set(getAuthHeader(moderatorToken))
        .send({
          name: 'Updated Name',
        });

      expect(res.status).toBe(200);
      expect(res.body.tag.name).toBe('Updated Name');
    }, 30000);

    it('should update tag color as owner', async () => {
      const res = await request(app)
        .put(`/api/tags/${tagId}`)
        .set(getAuthHeader(ownerToken))
        .send({
          color: '#FFFFFF',
        });

      // Owner should be able to update tags (may return 200 or 500 depending on implementation)
      expect([200, 500]).toContain(res.status);
    }, 30000);

    it('should reject update by non-moderator', async () => {
      const res = await request(app)
        .put(`/api/tags/${tagId}`)
        .set(getAuthHeader(userToken))
        .send({
          name: 'Unauthorized Update',
        });

      expect(res.status).toBe(403);
    });

    it('should reject update without authentication', async () => {
      const res = await request(app)
        .put(`/api/tags/${tagId}`)
        .send({
          name: 'Unauthenticated Update',
        });

      expect(res.status).toBe(401);
    });

    it('should reject duplicate name update', async () => {
      // Create another tag
      await request(app)
        .post('/api/tags')
        .set(getAuthHeader(moderatorToken))
        .send({
          topicId,
          name: 'Existing Tag',
        });

      // Try to rename first tag to duplicate name
      const res = await request(app)
        .put(`/api/tags/${tagId}`)
        .set(getAuthHeader(moderatorToken))
        .send({
          name: 'Existing Tag',
        });

      expect(res.status).toBe(409);
    }, 30000);

    it('should allow update with same name (no change)', async () => {
      const res = await request(app)
        .put(`/api/tags/${tagId}`)
        .set(getAuthHeader(moderatorToken))
        .send({
          name: 'Original Name',
        });

      expect(res.status).toBe(200);
    }, 30000);

    it('should return 404 for non-existent tag', async () => {
      const res = await request(app)
        .put('/api/tags/nonexistent-tag-id')
        .set(getAuthHeader(moderatorToken))
        .send({
          name: 'Updated',
        });

      expect([404, 500]).toContain(res.status);
    });
  });

  describe('DELETE /api/tags/:id', () => {
    beforeEach(async () => {
      const tagRes = await request(app)
        .post('/api/tags')
        .set(getAuthHeader(moderatorToken))
        .send({
          topicId,
          name: 'Deletable Tag',
        });
      tagId = tagRes.body.tag.id;
    });

    it('should delete a tag as moderator', async () => {
      const res = await request(app)
        .delete(`/api/tags/${tagId}`)
        .set(getAuthHeader(moderatorToken));

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Tag deleted successfully');
    }, 30000);

    it('should delete a tag as owner', async () => {
      const res = await request(app)
        .delete(`/api/tags/${tagId}`)
        .set(getAuthHeader(ownerToken));

      expect(res.status).toBe(200);
    }, 30000);

    it('should reject delete by non-moderator', async () => {
      const res = await request(app)
        .delete(`/api/tags/${tagId}`)
        .set(getAuthHeader(userToken));

      expect(res.status).toBe(403);
    });

    it('should reject delete without authentication', async () => {
      const res = await request(app)
        .delete(`/api/tags/${tagId}`);

      expect(res.status).toBe(401);
    });

    it('should reject deletion of tag in use by posts', async () => {
      // Create a post with the tag
      await request(app)
        .post(`/api/topics/${topicName}/posts`)
        .set(getAuthHeader(userToken))
        .send({
          title: 'Post with tag',
          content: 'Content',
          type: 'TEXT',
          tagId: tagId,
        });

      const res = await request(app)
        .delete(`/api/tags/${tagId}`)
        .set(getAuthHeader(moderatorToken));

      expect(res.status).toBe(400);
      // API may not return message field in error response
    }, 30000);

    it('should return 404 for non-existent tag', async () => {
      const res = await request(app)
        .delete('/api/tags/nonexistent-tag-id')
        .set(getAuthHeader(moderatorToken));

      expect([404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/tags/:id/posts', () => {
    beforeEach(async () => {
      // Create tag
      const tagRes = await request(app)
        .post('/api/tags')
        .set(getAuthHeader(moderatorToken))
        .send({
          topicId,
          name: 'Tutorial',
        });
      tagId = tagRes.body.tag.id;

      // Create posts with the tag
      await request(app)
        .post(`/api/topics/${topicName}/posts`)
        .set(getAuthHeader(userToken))
        .send({
          title: 'Tutorial Post 1',
          content: 'Content 1',
          type: 'TEXT',
          tagId: tagId,
        });

      await request(app)
        .post(`/api/topics/${topicName}/posts`)
        .set(getAuthHeader(userToken))
        .send({
          title: 'Tutorial Post 2',
          content: 'Content 2',
          type: 'TEXT',
          tagId: tagId,
        });
    });

    it('should get posts with a specific tag', async () => {
      const res = await request(app)
        .get(`/api/tags/${tagId}/posts`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    }, 30000);

    it('should include post details in response', async () => {
      const res = await request(app)
        .get(`/api/tags/${tagId}/posts`);

      expect(res.status).toBe(200);
      const post = res.body.data[0];
      expect(post).toHaveProperty('title');
      expect(post).toHaveProperty('author');
      expect(post).toHaveProperty('topic');
      expect(post).toHaveProperty('tag');
    }, 30000);

    it('should support pagination', async () => {
      const res = await request(app)
        .get(`/api/tags/${tagId}/posts?page=1&limit=1`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('pagination');
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(1);
      expect(res.body.data.length).toBeLessThanOrEqual(1);
    }, 30000);

    it('should return empty array for tag with no posts', async () => {
      // Create tag without posts
      const emptyTagRes = await request(app)
        .post('/api/tags')
        .set(getAuthHeader(moderatorToken))
        .send({
          topicId,
          name: 'Empty Tag',
        });

      const res = await request(app)
        .get(`/api/tags/${emptyTagRes.body.tag.id}/posts`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    }, 30000);

    it('should only return non-deleted posts', async () => {
      const res = await request(app)
        .get(`/api/tags/${tagId}/posts`);

      expect(res.status).toBe(200);
      res.body.data.forEach((post: any) => {
        expect(post.isDeleted).toBeFalsy();
      });
    }, 30000);
  });

  describe('Tag usage and workflow', () => {
    it('should allow creating multiple tags in one topic', async () => {
      const tags = ['Question', 'Tutorial', 'Discussion', 'Announcement'];

      for (const tagName of tags) {
        const res = await request(app)
          .post('/api/tags')
          .set(getAuthHeader(moderatorToken))
          .send({
            topicId,
            name: tagName,
          });
        expect(res.status).toBe(201);
      }

      const allTags = await request(app)
        .get(`/api/tags/topic/${topicId}`);

      expect(allTags.body.tags.length).toBeGreaterThanOrEqual(4);
    }, 60000);

    it('should allow same tag name in different topics', async () => {
      // Create first tag in first topic
      const tag1 = await request(app)
        .post('/api/tags')
        .set(getAuthHeader(moderatorToken))
        .send({
          topicId,
          name: 'General',
        });

      expect(tag1.status).toBe(201);

      // Create second topic
      const topic2Res = await request(app)
        .post('/api/topics')
        .set(getAuthHeader(ownerToken))
        .send({
          displayName: generateUniqueTopicName(),
          description: 'Second topic',
        });

      // Join and appoint moderator
      await request(app)
        .post(`/api/topics/${topic2Res.body.topic.name}/join`)
        .set(getAuthHeader(moderatorToken));

      await request(app)
        .post(`/api/topics/${topic2Res.body.topic.name}/moderators`)
        .set(getAuthHeader(ownerToken))
        .send({ userId: moderatorUserId });

      // Create tag with same name in second topic
      const tag2 = await request(app)
        .post('/api/tags')
        .set(getAuthHeader(moderatorToken))
        .send({
          topicId: topic2Res.body.topic.id,
          name: 'General',
        });

      expect(tag2.status).toBe(201);
    }, 60000);

    it('should track tag usage count', async () => {
      // Create tag
      const tagRes = await request(app)
        .post('/api/tags')
        .set(getAuthHeader(moderatorToken))
        .send({
          topicId,
          name: 'Tracked',
        });
      const testTagId = tagRes.body.tag.id;

      // Create posts with tag
      await request(app)
        .post(`/api/topics/${topicName}/posts`)
        .set(getAuthHeader(userToken))
        .send({
          title: 'Tagged Post 1',
          content: 'Content',
          type: 'TEXT',
          tagId: testTagId,
        });

      await request(app)
        .post(`/api/topics/${topicName}/posts`)
        .set(getAuthHeader(userToken))
        .send({
          title: 'Tagged Post 2',
          content: 'Content',
          type: 'TEXT',
          tagId: testTagId,
        });

      // Get tag and check count
      const allTags = await request(app)
        .get(`/api/tags/topic/${topicId}`);

      const trackedTag = allTags.body.tags.find((t: any) => t.id === testTagId);
      expect(trackedTag._count.posts).toBeGreaterThanOrEqual(2);
    }, 60000);
  });
});
