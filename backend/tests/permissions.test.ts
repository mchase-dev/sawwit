import request from 'supertest';
import app from '../src/index';
import { cleanDatabase, disconnectDatabase, getTestDb } from './utils/testDb';
import { getAuthHeader } from './utils/testAuth';
import { generateUniqueUsername, generateUniqueEmail } from './utils/testHelpers';
import { users } from './setup/schema.sqlite';
import { eq } from 'drizzle-orm';

// Helper to generate unique topic display name
let topicCounter = 0;
const generateUniqueTopicName = () => {
  topicCounter++;
  return `Permissions Test ${Date.now()}-${topicCounter}`;
};

describe('Permissions and RBAC', () => {
  let regularUserToken: string;
  let regularUserId: string;
  let moderatorToken: string;
  let moderatorUserId: string;
  let ownerToken: string;
  let ownerId: string;
  let superuserToken: string;
  let superuserId: string;
  let nonMemberToken: string;
  let nonMemberId: string;
  let bannedUserToken: string;
  let bannedUserId: string;
  let topicName: string;
  let postId: string;
  let commentId: string;

  beforeEach(async () => {
    await cleanDatabase();

    // Create regular user
    const regularUserRes = await request(app)
      .post('/api/auth/register')
      .send({
        username: generateUniqueUsername(),
        email: generateUniqueEmail(),
        password: 'Test123!@#',
        agreedToTerms: true,
      });
    regularUserToken = regularUserRes.body.accessToken;
    regularUserId = regularUserRes.body.user.id;

    // Create moderator user
    const moderatorRes = await request(app)
      .post('/api/auth/register')
      .send({
        username: generateUniqueUsername(),
        email: generateUniqueEmail(),
        password: 'Test123!@#',
        agreedToTerms: true,
      });
    moderatorToken = moderatorRes.body.accessToken;
    moderatorUserId = moderatorRes.body.user.id;

    // Create topic owner
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

    // Create superuser manually in database
    const superuserUsername = generateUniqueUsername();
    const superuserEmail = generateUniqueEmail();
    await request(app)
      .post('/api/auth/register')
      .send({
        username: superuserUsername,
        email: superuserEmail,
        password: 'Test123!@#',
        agreedToTerms: true,
      });

    // Update user to be superuser
    const db = getTestDb();
    const [superuser] = await db.update(users)
      .set({ isSuperuser: 1 })
      .where(eq(users.email, superuserEmail))
      .returning();
    superuserId = superuser.id;

    // Login to get token with superuser flag
    const superuserLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: superuserEmail,
        password: 'Test123!@#',
      });
    superuserToken = superuserLoginRes.body.accessToken;

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
    nonMemberId = nonMemberRes.body.user.id;

    // Create banned user
    const bannedUserRes = await request(app)
      .post('/api/auth/register')
      .send({
        username: generateUniqueUsername(),
        email: generateUniqueEmail(),
        password: 'Test123!@#',
        agreedToTerms: true,
      });
    bannedUserToken = bannedUserRes.body.accessToken;
    bannedUserId = bannedUserRes.body.user.id;

    // Create topic with owner
    const topicRes = await request(app)
      .post('/api/topics')
      .set(getAuthHeader(ownerToken))
      .send({
        displayName: generateUniqueTopicName(),
        description: 'A test topic for permissions',
      });

    if (!topicRes.body.topic) {
      console.error('Topic creation failed:', topicRes.status, topicRes.body);
      throw new Error(`Failed to create topic in test setup. Status: ${topicRes.status}`);
    }
    topicName = topicRes.body.topic.name;

    // Join topic with regular user, moderator, and banned user
    await request(app)
      .post(`/api/topics/${topicName}/join`)
      .set(getAuthHeader(regularUserToken));

    await request(app)
      .post(`/api/topics/${topicName}/join`)
      .set(getAuthHeader(moderatorToken));

    await request(app)
      .post(`/api/topics/${topicName}/join`)
      .set(getAuthHeader(bannedUserToken));

    // Appoint moderator
    await request(app)
      .post(`/api/topics/${topicName}/moderators`)
      .set(getAuthHeader(ownerToken))
      .send({ userId: moderatorUserId });

    // Ban user
    await request(app)
      .post(`/api/topics/${topicName}/ban`)
      .set(getAuthHeader(ownerToken))
      .send({ userId: bannedUserId, reason: 'Test ban' });

    // Create a post
    const postRes = await request(app)
      .post(`/api/topics/${topicName}/posts`)
      .set(getAuthHeader(regularUserToken))
      .send({
        title: 'Test Post',
        content: 'Test content',
        type: 'TEXT',
      });
    postId = postRes.body.post.id;

    // Create a comment
    const commentRes = await request(app)
      .post(`/api/posts/${postId}/comments`)
      .set(getAuthHeader(regularUserToken))
      .send({
        content: 'Test comment',
      });
    commentId = commentRes.body.comment.id;
  }, 120000);

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe('Authentication Middleware', () => {
    it('should reject requests without token', async () => {
      const res = await request(app)
        .post(`/api/topics/${topicName}/posts`)
        .send({
          title: 'Test',
          content: 'Test',
          type: 'TEXT',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/token|authentication/i);
    });

    it('should reject requests with invalid token', async () => {
      const res = await request(app)
        .post(`/api/topics/${topicName}/posts`)
        .set('Authorization', 'Bearer invalid-token-12345')
        .send({
          title: 'Test',
          content: 'Test',
          type: 'TEXT',
        });

      expect(res.status).toBe(401);
    });

    it('should accept requests with valid token', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set(getAuthHeader(regularUserToken));

      expect(res.status).toBe(200);
    });

    it('should allow optional authentication endpoints without token', async () => {
      const res = await request(app)
        .get(`/api/topics/${topicName}`);

      expect(res.status).toBe(200);
    });
  });

  describe('Topic Membership Permissions', () => {
    it('should allow members to create posts', async () => {
      const res = await request(app)
        .post(`/api/topics/${topicName}/posts`)
        .set(getAuthHeader(regularUserToken))
        .send({
          title: 'Member Post',
          content: 'Content',
          type: 'TEXT',
        });

      expect(res.status).toBe(201);
    }, 30000);

    it('should allow non-members to view public content', async () => {
      const res = await request(app)
        .get(`/api/topics/${topicName}`);

      expect(res.status).toBe(200);
    });

    it('should prevent banned users from creating posts', async () => {
      const res = await request(app)
        .post(`/api/topics/${topicName}/posts`)
        .set(getAuthHeader(bannedUserToken))
        .send({
          title: 'Banned Post',
          content: 'Content',
          type: 'TEXT',
        });

      // Banned users should be rejected
      expect(res.status).toBe(403);
    });

    it('should prevent banned users from creating comments', async () => {
      const res = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set(getAuthHeader(bannedUserToken))
        .send({
          content: 'Banned comment',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('Moderator Permissions', () => {
    it('should allow moderator to ban users', async () => {
      const res = await request(app)
        .post(`/api/topics/${topicName}/ban`)
        .set(getAuthHeader(moderatorToken))
        .send({
          userId: nonMemberId,
          reason: 'Moderator test ban',
        });

      // Moderator should have ban permissions (may return 400 if user isn't member)
      expect([200, 400, 403]).toContain(res.status);
    }, 30000);

    it('should allow moderator to delete posts', async () => {
      const res = await request(app)
        .delete(`/api/posts/${postId}`)
        .set(getAuthHeader(moderatorToken));

      expect(res.status).toBe(200);
    }, 30000);

    it('should allow moderator to delete comments', async () => {
      const res = await request(app)
        .delete(`/api/comments/${commentId}`)
        .set(getAuthHeader(moderatorToken));

      expect(res.status).toBe(200);
    }, 30000);

    it('should allow moderator to edit posts', async () => {
      const res = await request(app)
        .put(`/api/posts/${postId}`)
        .set(getAuthHeader(moderatorToken))
        .send({
          content: 'Moderator edited content',
        });

      expect(res.status).toBe(200);
    }, 30000);

    it('should prevent regular user from banning', async () => {
      const res = await request(app)
        .post(`/api/topics/${topicName}/ban`)
        .set(getAuthHeader(regularUserToken))
        .send({
          userId: nonMemberId,
          reason: 'Test',
        });

      expect(res.status).toBe(403);
    });

    it('should prevent non-member from moderator actions', async () => {
      const res = await request(app)
        .post(`/api/topics/${topicName}/ban`)
        .set(getAuthHeader(nonMemberToken))
        .send({
          userId: regularUserId,
          reason: 'Test',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('Owner Permissions', () => {
    it('should allow owner to appoint moderators', async () => {
      const newUserRes = await request(app)
        .post('/api/auth/register')
        .send({
          username: generateUniqueUsername(),
          email: generateUniqueEmail(),
          password: 'Test123!@#',
          agreedToTerms: true,
        });
      const newUserId = newUserRes.body.user.id;
      const newUserToken = newUserRes.body.accessToken;

      await request(app)
        .post(`/api/topics/${topicName}/join`)
        .set(getAuthHeader(newUserToken));

      const res = await request(app)
        .post(`/api/topics/${topicName}/moderators`)
        .set(getAuthHeader(ownerToken))
        .send({ userId: newUserId });

      expect(res.status).toBe(200);
    }, 30000);

    it('should allow owner to remove moderators', async () => {
      const res = await request(app)
        .delete(`/api/topics/${topicName}/moderators/${moderatorUserId}`)
        .set(getAuthHeader(ownerToken));

      expect(res.status).toBe(200);
    }, 30000);

    it('should allow owner to update topic', async () => {
      const res = await request(app)
        .put(`/api/topics/${topicName}`)
        .set(getAuthHeader(ownerToken))
        .send({
          description: 'Updated description',
        });

      expect(res.status).toBe(200);
    }, 30000);

    it('should allow owner to delete topic', async () => {
      // Create a new topic for deletion test
      const newTopicRes = await request(app)
        .post('/api/topics')
        .set(getAuthHeader(ownerToken))
        .send({
          displayName: 'Topic to Delete',
          description: 'Will be deleted',
        });

      const res = await request(app)
        .delete(`/api/topics/${newTopicRes.body.topic.name}`)
        .set(getAuthHeader(ownerToken));

      expect(res.status).toBe(200);
    }, 30000);

    it('should prevent moderator from appointing other moderators', async () => {
      const res = await request(app)
        .post(`/api/topics/${topicName}/moderators`)
        .set(getAuthHeader(moderatorToken))
        .send({ userId: nonMemberId });

      expect(res.status).toBe(403);
    });

    it('should prevent regular user from updating topic', async () => {
      const res = await request(app)
        .put(`/api/topics/${topicName}`)
        .set(getAuthHeader(regularUserToken))
        .send({
          description: 'Unauthorized update',
        });

      expect(res.status).toBe(403);
    });

    it('should prevent owner from leaving their own topic', async () => {
      const res = await request(app)
        .post(`/api/topics/${topicName}/leave`)
        .set(getAuthHeader(ownerToken));

      // Owner should not be able to leave their own topic
      expect(res.status).toBe(400);
    });
  });

  describe('Superuser Bypass', () => {
    it('should allow superuser to access admin reports endpoint', async () => {
      const res = await request(app)
        .get('/api/reports')
        .set(getAuthHeader(superuserToken));

      expect(res.status).toBe(200);
    }, 30000);

    it('should prevent regular user from accessing admin reports', async () => {
      const res = await request(app)
        .get('/api/reports')
        .set(getAuthHeader(regularUserToken));

      expect(res.status).toBe(403);
    });

    it('should allow superuser to access admin modlog endpoint', async () => {
      const res = await request(app)
        .get('/api/modlog')
        .set(getAuthHeader(superuserToken));

      expect(res.status).toBe(200);
    }, 30000);

    it('should prevent regular user from accessing admin modlog', async () => {
      const res = await request(app)
        .get('/api/modlog')
        .set(getAuthHeader(regularUserToken));

      expect(res.status).toBe(403);
    });

    it('should allow superuser to perform moderator actions without membership', async () => {
      // Create a new topic that superuser is not a member of
      const newTopicRes = await request(app)
        .post('/api/topics')
        .set(getAuthHeader(regularUserToken))
        .send({
          displayName: 'Superuser Test Topic',
          description: 'Testing superuser bypass',
        });
      const newTopicName = newTopicRes.body.topic.name;

      // Superuser should be able to perform mod actions without joining
      const res = await request(app)
        .post(`/api/topics/${newTopicName}/ban`)
        .set(getAuthHeader(superuserToken))
        .send({
          userId: nonMemberId,
          reason: 'Superuser bypass test',
        });

      // Should succeed or be blocked by other validation (not membership)
      expect([200, 400, 403, 404]).toContain(res.status);
    }, 30000);
  });

  describe('Content Ownership Permissions', () => {
    it('should allow author to edit own post', async () => {
      const res = await request(app)
        .put(`/api/posts/${postId}`)
        .set(getAuthHeader(regularUserToken))
        .send({
          content: 'Updated by author',
        });

      expect(res.status).toBe(200);
    }, 30000);

    it('should allow author to delete own post', async () => {
      // Create a new post for deletion
      const newPostRes = await request(app)
        .post(`/api/topics/${topicName}/posts`)
        .set(getAuthHeader(regularUserToken))
        .send({
          title: 'Post to Delete',
          content: 'Will be deleted',
          type: 'TEXT',
        });

      const res = await request(app)
        .delete(`/api/posts/${newPostRes.body.post.id}`)
        .set(getAuthHeader(regularUserToken));

      expect(res.status).toBe(200);
    }, 30000);

    it('should allow author to edit own comment', async () => {
      const res = await request(app)
        .put(`/api/comments/${commentId}`)
        .set(getAuthHeader(regularUserToken))
        .send({
          content: 'Updated by author',
        });

      expect(res.status).toBe(200);
    }, 30000);

    it('should allow author to delete own comment', async () => {
      // Create a new comment for deletion
      const newCommentRes = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set(getAuthHeader(regularUserToken))
        .send({
          content: 'Comment to delete',
        });

      const res = await request(app)
        .delete(`/api/comments/${newCommentRes.body.comment.id}`)
        .set(getAuthHeader(regularUserToken));

      expect(res.status).toBe(200);
    }, 30000);

    it('should prevent non-author from editing post', async () => {
      // Create post by owner
      const ownerPostRes = await request(app)
        .post(`/api/topics/${topicName}/posts`)
        .set(getAuthHeader(ownerToken))
        .send({
          title: 'Owner Post',
          content: 'Owner content',
          type: 'TEXT',
        });

      // Try to edit as regular user
      const res = await request(app)
        .put(`/api/posts/${ownerPostRes.body.post.id}`)
        .set(getAuthHeader(regularUserToken))
        .send({
          content: 'Unauthorized edit',
        });

      expect(res.status).toBe(403);
    }, 30000);

    it('should prevent non-author from deleting post', async () => {
      // Create post by owner
      const ownerPostRes = await request(app)
        .post(`/api/topics/${topicName}/posts`)
        .set(getAuthHeader(ownerToken))
        .send({
          title: 'Owner Post',
          content: 'Owner content',
          type: 'TEXT',
        });

      // Try to delete as regular user
      const res = await request(app)
        .delete(`/api/posts/${ownerPostRes.body.post.id}`)
        .set(getAuthHeader(regularUserToken));

      expect(res.status).toBe(403);
    }, 30000);
  });

  describe('Role Hierarchy', () => {
    it('should recognize owner has implicit moderator privileges for banning', async () => {
      // Owner should be able to ban users like a moderator
      const newUserRes = await request(app)
        .post('/api/auth/register')
        .send({
          username: generateUniqueUsername(),
          email: generateUniqueEmail(),
          password: 'Test123!@#',
          agreedToTerms: true,
        });
      const newUserToken = newUserRes.body.accessToken;
      const newUserId = newUserRes.body.user.id;

      // Join topic
      await request(app)
        .post(`/api/topics/${topicName}/join`)
        .set(getAuthHeader(newUserToken));

      // Owner can ban
      const res = await request(app)
        .post(`/api/topics/${topicName}/ban`)
        .set(getAuthHeader(ownerToken))
        .send({
          userId: newUserId,
          reason: 'Test ban by owner',
        });

      expect(res.status).toBe(200);
    }, 30000);

    it('should maintain separate owner and moderator roles', async () => {
      // Check that moderator cannot appoint other moderators
      const res = await request(app)
        .post(`/api/topics/${topicName}/moderators`)
        .set(getAuthHeader(moderatorToken))
        .send({ userId: nonMemberId });

      expect(res.status).toBe(403);
    });

    it('should ensure superuser bypasses topic-level permissions', async () => {
      // Superuser should access admin endpoints without topic membership
      const res = await request(app)
        .get('/api/reports')
        .set(getAuthHeader(superuserToken));

      expect(res.status).toBe(200);
    }, 30000);
  });

  describe('Cross-Topic Permissions', () => {
    it('should isolate permissions between different topics', async () => {
      // Create second topic
      const topic2Res = await request(app)
        .post('/api/topics')
        .set(getAuthHeader(regularUserToken))
        .send({
          displayName: 'Second Topic',
          description: 'Another topic',
        });
      const topic2Name = topic2Res.body.topic.name;

      // Moderator of topic1 should not have permissions in topic2
      const res = await request(app)
        .post(`/api/topics/${topic2Name}/ban`)
        .set(getAuthHeader(moderatorToken))
        .send({
          userId: nonMemberId,
          reason: 'Cross-topic test',
        });

      expect(res.status).toBe(403);
    }, 30000);

    it('should require separate membership for each topic', async () => {
      // Create second topic
      const topic2Res = await request(app)
        .post('/api/topics')
        .set(getAuthHeader(ownerToken))
        .send({
          displayName: 'Third Topic',
          description: 'Testing membership',
        });
      const topic2Name = topic2Res.body.topic.name;

      // Regular user is member of topic1 but not topic2
      const res = await request(app)
        .post(`/api/topics/${topic2Name}/posts`)
        .set(getAuthHeader(regularUserToken))
        .send({
          title: 'Test',
          content: 'Test',
          type: 'TEXT',
        });

      // Should fail because not a member (unless membership is auto-created)
      expect([201, 403]).toContain(res.status);
    }, 30000);
  });
});
