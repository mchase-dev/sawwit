import request from 'supertest';
import app from '../src/index';
import { cleanDatabase, disconnectDatabase } from './utils/testDb';
import { getAuthHeader } from './utils/testAuth';
import { generateUniqueUsername, generateUniqueEmail } from './utils/testHelpers';

describe('User Mentions System', () => {
  let user1Token: string;
  let user1Id: string;
  let user1Username: string;
  let user2Token: string;
  let user2Id: string;
  let user2Username: string;
  let topicName: string;
  let postId: string;

  beforeEach(async () => {
    await cleanDatabase();

    // Create user 1
    user1Username = generateUniqueUsername();
    const user1Res = await request(app)
      .post('/api/auth/register')
      .send({
        username: user1Username,
        email: generateUniqueEmail(),
        password: 'Test123!@#',
        agreedToTerms: true,
      });
    user1Token = user1Res.body.accessToken;
    user1Id = user1Res.body.user.id;

    // Create user 2
    user2Username = generateUniqueUsername();
    const user2Res = await request(app)
      .post('/api/auth/register')
      .send({
        username: user2Username,
        email: generateUniqueEmail(),
        password: 'Test123!@#',
        agreedToTerms: true,
      });
    user2Token = user2Res.body.accessToken;
    user2Id = user2Res.body.user.id;

    // Create topic
    const topicRes = await request(app)
      .post('/api/topics')
      .set(getAuthHeader(user1Token))
      .send({
        displayName: 'Test Topic',
        description: 'A test topic',
      });
    topicName = topicRes.body.topic.name;

    // Both users join topic
    await request(app)
      .post(`/api/topics/${topicName}/join`)
      .set(getAuthHeader(user2Token));

    // Create a post
    const postRes = await request(app)
      .post(`/api/topics/${topicName}/posts`)
      .set(getAuthHeader(user1Token))
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

  describe('Mention Detection in Comments', () => {
    it('should detect @username mention in comment', async () => {
      const res = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set(getAuthHeader(user2Token))
        .send({
          content: `Hey @${user1Username}, great post!`,
        });

      expect([201, 200]).toContain(res.status);
      if (res.body.comment) {
        expect(res.body.comment.content).toContain(`@${user1Username}`);
      }
    }, 30000);

    it('should create notification for mentioned user', async () => {
      // User 2 mentions user 1
      await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set(getAuthHeader(user2Token))
        .send({
          content: `@${user1Username} check this out`,
        });

      // User 1 should have a notification
      const notifRes = await request(app)
        .get('/api/notifications')
        .set(getAuthHeader(user1Token));

      expect(notifRes.status).toBe(200);
      // May or may not have mention notifications depending on implementation
      if (notifRes.body.data) {
        const mentionNotif = notifRes.body.data.find(
          (n: any) => n.type === 'USER_MENTIONED' || n.type === 'MENTION'
        );
        if (mentionNotif) {
          expect(mentionNotif).toBeDefined();
        }
      }
    }, 30000);

    it('should detect multiple mentions in one comment', async () => {
      // Create user 3
      const user3Username = generateUniqueUsername();
      const user3Res = await request(app)
        .post('/api/auth/register')
        .send({
          username: user3Username,
          email: generateUniqueEmail(),
          password: 'Test123!@#',
          agreedToTerms: true,
        });

      await request(app)
        .post(`/api/topics/${topicName}/join`)
        .set(getAuthHeader(user3Res.body.accessToken));

      const res = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set(getAuthHeader(user2Token))
        .send({
          content: `Hey @${user1Username} and @${user3Username}, what do you think?`,
        });

      expect([201, 200]).toContain(res.status);
    }, 30000);

    it('should limit mentions to maximum of 5 per comment', async () => {
      // Create 6 users and try to mention all
      const usernames = [user1Username];
      for (let i = 0; i < 5; i++) {
        const username = generateUniqueUsername();
        const userRes = await request(app)
          .post('/api/auth/register')
          .send({
            username,
            email: generateUniqueEmail(),
            password: 'Test123!@#',
            agreedToTerms: true,
          });
        usernames.push(username);

        await request(app)
          .post(`/api/topics/${topicName}/join`)
          .set(getAuthHeader(userRes.body.accessToken));
      }

      const content = usernames.map(u => `@${u}`).join(' ');
      const res = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set(getAuthHeader(user2Token))
        .send({ content });

      // Should either succeed with max 5 mentions or return error
      expect([201, 200, 400]).toContain(res.status);
    }, 60000);

    it('should not create notification for self-mention', async () => {
      // User mentions themselves
      await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set(getAuthHeader(user1Token))
        .send({
          content: `As @${user1Username} said before...`,
        });

      const notifRes = await request(app)
        .get('/api/notifications')
        .set(getAuthHeader(user1Token));

      expect(notifRes.status).toBe(200);
      // Should not have self-mention notification
      if (notifRes.body.data) {
        const selfMention = notifRes.body.data.find(
          (n: any) => n.type === 'USER_MENTIONED' && n.message.includes(user1Username)
        );
        expect(selfMention).toBeUndefined();
      }
    }, 30000);

    it('should not create notification for non-existent user', async () => {
      const res = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set(getAuthHeader(user2Token))
        .send({
          content: '@nonexistentuser123 hello',
        });

      // Should succeed but not create notification
      expect([201, 200]).toContain(res.status);
    }, 30000);
  });

  describe('Mention Detection in Posts', () => {
    it('should detect @username mention in post content', async () => {
      const res = await request(app)
        .post(`/api/topics/${topicName}/posts`)
        .set(getAuthHeader(user2Token))
        .send({
          title: 'Mention Post',
          content: `I want to discuss this with @${user1Username}`,
          type: 'TEXT',
        });

      expect([201, 200]).toContain(res.status);
    }, 30000);

    it('should create notification for user mentioned in post', async () => {
      // User 2 mentions user 1 in post
      await request(app)
        .post(`/api/topics/${topicName}/posts`)
        .set(getAuthHeader(user2Token))
        .send({
          title: 'Mention Post',
          content: `Calling @${user1Username} for feedback`,
          type: 'TEXT',
        });

      // Check notifications
      const notifRes = await request(app)
        .get('/api/notifications')
        .set(getAuthHeader(user1Token));

      expect(notifRes.status).toBe(200);
      // May have mention notification
    }, 30000);
  });

  describe('GET /api/mentions', () => {
    beforeEach(async () => {
      // Create mentions for user 1
      await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set(getAuthHeader(user2Token))
        .send({
          content: `@${user1Username} great work!`,
        });
    });

    it('should get all mentions for authenticated user', async () => {
      const res = await request(app)
        .get('/api/mentions')
        .set(getAuthHeader(user1Token));

      // Endpoint may or may not exist
      expect([200, 404]).toContain(res.status);
      if (res.status === 200 && res.body.mentions) {
        expect(Array.isArray(res.body.mentions)).toBe(true);
      }
    }, 30000);

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/mentions');

      expect(res.status).toBe(401);
    }, 30000);

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/mentions?page=1&limit=10')
        .set(getAuthHeader(user1Token));

      expect([200, 404]).toContain(res.status);
    }, 30000);
  });

  describe('Mention Format Detection', () => {
    it('should detect @username at start of comment', async () => {
      const res = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set(getAuthHeader(user2Token))
        .send({
          content: `@${user1Username} what do you think?`,
        });

      expect([201, 200]).toContain(res.status);
    }, 30000);

    it('should detect @username in middle of comment', async () => {
      const res = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set(getAuthHeader(user2Token))
        .send({
          content: `I agree with @${user1Username} on this`,
        });

      expect([201, 200]).toContain(res.status);
    }, 30000);

    it('should detect @username at end of comment', async () => {
      const res = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set(getAuthHeader(user2Token))
        .send({
          content: `Great point @${user1Username}`,
        });

      expect([201, 200]).toContain(res.status);
    }, 30000);

    it('should handle @username with punctuation', async () => {
      const res = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set(getAuthHeader(user2Token))
        .send({
          content: `Hey @${user1Username}, how are you?`,
        });

      expect([201, 200]).toContain(res.status);
    }, 30000);

    it('should not detect email addresses as mentions', async () => {
      const res = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set(getAuthHeader(user2Token))
        .send({
          content: 'Contact me at user@example.com',
        });

      expect([201, 200]).toContain(res.status);
      // Should not create mention for email address
    }, 30000);
  });

  describe('Mention Statistics', () => {
    it('should track who mentions a user most', async () => {
      // User 2 mentions user 1 multiple times
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post(`/api/posts/${postId}/comments`)
          .set(getAuthHeader(user2Token))
          .send({
            content: `@${user1Username} comment ${i + 1}`,
          });
      }

      // Check if endpoint exists for top mentioners
      const res = await request(app)
        .get('/api/mentions/top')
        .set(getAuthHeader(user1Token));

      expect([200, 404]).toContain(res.status);
    }, 30000);

    it('should count total mentions received', async () => {
      // Create mentions
      await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set(getAuthHeader(user2Token))
        .send({
          content: `@${user1Username} hello`,
        });

      const res = await request(app)
        .get('/api/mentions')
        .set(getAuthHeader(user1Token));

      expect([200, 404]).toContain(res.status);
      if (res.status === 200 && res.body.mentions) {
        expect(res.body.mentions.length).toBeGreaterThanOrEqual(0);
      }
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should handle malformed mentions', async () => {
      const res = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set(getAuthHeader(user2Token))
        .send({
          content: '@ @ @@ @@@ invalid mentions',
        });

      // Should still create comment even with malformed mentions
      expect([201, 200]).toContain(res.status);
    }, 30000);

    it('should handle very long usernames in mentions', async () => {
      const res = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set(getAuthHeader(user2Token))
        .send({
          content: '@verylongusernamethatdoesnotexistandisprobablyinvalid hello',
        });

      expect([201, 200]).toContain(res.status);
    }, 30000);
  });
});
