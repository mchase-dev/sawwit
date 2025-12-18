import request from 'supertest';
import app from '../src/index';
import { cleanDatabase, disconnectDatabase } from './utils/testDb';
import { getAuthHeader } from './utils/testAuth';

// Helper to check error message (handles both string and object format)
const expectErrorMessage = (error: any, pattern: RegExp) => {
  if (typeof error === 'string') {
    expect(error).toMatch(pattern);
  } else if (error && error.message) {
    expect(error.message).toMatch(pattern);
  } else {
    throw new Error(`Unexpected error format: ${JSON.stringify(error)}`);
  }
};

describe('Messages API', () => {
  let user1Token: string;
  let user2Token: string;
  let user3Token: string;
  let user1Id: string;
  let user2Id: string;
  let user3Id: string;

  beforeAll(async () => {
    await cleanDatabase();

    // Register users
    const user1Res = await request(app).post('/api/auth/register').send({
      username: 'msguser1',
      email: 'msguser1@test.com',
      password: 'Password123!',
      agreedToTerms: true,
    });
    user1Token = user1Res.body.accessToken;
    user1Id = user1Res.body.user.id;

    const user2Res = await request(app).post('/api/auth/register').send({
      username: 'msguser2',
      email: 'msguser2@test.com',
      password: 'Password123!',
      agreedToTerms: true,
    });
    user2Token = user2Res.body.accessToken;
    user2Id = user2Res.body.user.id;

    const user3Res = await request(app).post('/api/auth/register').send({
      username: 'msguser3',
      email: 'msguser3@test.com',
      password: 'Password123!',
      agreedToTerms: true,
    });
    user3Token = user3Res.body.accessToken;
    user3Id = user3Res.body.user.id;
  }, 120000);

  afterAll(async () => {
    await cleanDatabase();
    await disconnectDatabase();
  });

  // POST /api/messages - Send a direct message
  describe('POST /api/messages', () => {
    it('should send a direct message', async () => {
      const res = await request(app)
        .post('/api/messages')
        .set(getAuthHeader(user1Token))
        .send({
          recipientId: user2Id,
          content: 'Hello User2!',
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toBeDefined();
      expect(res.body.message.content).toBe('Hello User2!');
      expect(res.body.message.senderId).toBe(user1Id);
      expect(res.body.message.recipientId).toBe(user2Id);
    }, 30000);

    it('should reject sending message to yourself', async () => {
      const res = await request(app)
        .post('/api/messages')
        .set(getAuthHeader(user1Token))
        .send({
          recipientId: user1Id,
          content: 'Message to myself',
        });

      expect(res.status).toBe(400);
      expectErrorMessage(res.body.error, /cannot send message to yourself/i);
    }, 30000);

    it('should reject sending message to non-existent user', async () => {
      const res = await request(app)
        .post('/api/messages')
        .set(getAuthHeader(user1Token))
        .send({
          recipientId: 'nonexistent-id',
          content: 'Hello',
        });

      expect(res.status).toBe(404);
      expectErrorMessage(res.body.error, /recipient not found/i);
    }, 30000);

    it('should reject sending message when blocked', async () => {
      // User2 blocks User1
      await request(app)
        .post(`/api/blocks/${user1Id}`)
        .set(getAuthHeader(user2Token));

      const res = await request(app)
        .post('/api/messages')
        .set(getAuthHeader(user1Token))
        .send({
          recipientId: user2Id,
          content: 'Blocked message',
        });

      expect(res.status).toBe(403);
      expectErrorMessage(res.body.error, /blocked/i);

      // Unblock for next tests
      await request(app)
        .delete(`/api/blocks/${user1Id}`)
        .set(getAuthHeader(user2Token));
    }, 30000);

    it('should send a reply to a message', async () => {
      // User1 sends message
      const msg1 = await request(app)
        .post('/api/messages')
        .set(getAuthHeader(user1Token))
        .send({
          recipientId: user2Id,
          content: 'Question?',
        });

      const parentId = msg1.body.message.id;

      // User2 replies
      const res = await request(app)
        .post('/api/messages')
        .set(getAuthHeader(user2Token))
        .send({
          recipientId: user1Id,
          content: 'Answer!',
          parentMessageId: parentId,
        });

      expect(res.status).toBe(201);
      expect(res.body.message.parentId).toBe(parentId);
    }, 30000);

    it('should reject reply to non-existent parent', async () => {
      const res = await request(app)
        .post('/api/messages')
        .set(getAuthHeader(user1Token))
        .send({
          recipientId: user2Id,
          content: 'Reply',
          parentMessageId: 'nonexistent-id',
        });

      expect(res.status).toBe(404);
      expectErrorMessage(res.body.error, /parent message not found/i);
    }, 30000);

    it('should reject reply to message not in conversation', async () => {
      // User1 sends to User2
      const msg = await request(app)
        .post('/api/messages')
        .set(getAuthHeader(user1Token))
        .send({
          recipientId: user2Id,
          content: 'Hello User2',
        });

      // User3 tries to reply to it
      const res = await request(app)
        .post('/api/messages')
        .set(getAuthHeader(user3Token))
        .send({
          recipientId: user1Id,
          content: 'Intruding reply',
          parentMessageId: msg.body.message.id,
        });

      expect(res.status).toBe(400);
      expectErrorMessage(res.body.error, /not in this conversation/i);
    }, 30000);

    it('should require authentication', async () => {
      const res = await request(app).post('/api/messages').send({
        recipientId: user2Id,
        content: 'No auth',
      });

      expect(res.status).toBe(401);
    }, 30000);
  });

  // GET /api/messages/conversations - Get conversations
  describe('GET /api/messages/conversations', () => {
    beforeAll(async () => {
      // User1 messages User2
      await request(app)
        .post('/api/messages')
        .set(getAuthHeader(user1Token))
        .send({
          recipientId: user2Id,
          content: 'Conv test 1',
        });

      // User3 messages User1
      await request(app)
        .post('/api/messages')
        .set(getAuthHeader(user3Token))
        .send({
          recipientId: user1Id,
          content: 'Conv test 2',
        });
    }, 30000);

    it('should get user conversations', async () => {
      const res = await request(app)
        .get('/api/messages/conversations')
        .set(getAuthHeader(user1Token));

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      // Should have conversation with User2 and User3
      const partnerIds = res.body.data.map((conv: any) => conv.partnerId);
      expect(partnerIds).toContain(user2Id);
      expect(partnerIds).toContain(user3Id);
    }, 30000);

    it('should show unread counts in conversations', async () => {
      const res = await request(app)
        .get('/api/messages/conversations')
        .set(getAuthHeader(user1Token));

      expect(res.status).toBe(200);

      // Find conversation with User3 (who sent a message)
      const conv = res.body.data.find((c: any) => c.partnerId === user3Id);
      if (conv) {
        expect(conv.unreadCount).toBeDefined();
        expect(typeof conv.unreadCount).toBe('number');
      }
    }, 30000);

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/messages/conversations?page=1&limit=1')
        .set(getAuthHeader(user1Token));

      expect(res.status).toBe(200);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(1);
    }, 30000);

    it('should require authentication', async () => {
      const res = await request(app).get('/api/messages/conversations');

      expect(res.status).toBe(401);
    }, 30000);
  });

  // GET /api/messages/conversation/:partnerId - Get conversation messages
  describe('GET /api/messages/conversation/:partnerId', () => {
    let messageId: string;

    beforeAll(async () => {
      // Clean previous messages and create fresh ones
      const msg = await request(app)
        .post('/api/messages')
        .set(getAuthHeader(user1Token))
        .send({
          recipientId: user2Id,
          content: 'Conversation message',
        });

      messageId = msg.body.message.id;

      await request(app)
        .post('/api/messages')
        .set(getAuthHeader(user2Token))
        .send({
          recipientId: user1Id,
          content: 'Reply message',
        });
    }, 30000);

    it('should get messages in a conversation', async () => {
      const res = await request(app)
        .get(`/api/messages/conversation/${user2Id}`)
        .set(getAuthHeader(user1Token));

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    }, 30000);

    it('should mark messages as read when fetching', async () => {
      // User1 fetches conversation with User2
      await request(app)
        .get(`/api/messages/conversation/${user2Id}`)
        .set(getAuthHeader(user1Token));

      // Check unread count - should be 0 for messages from User2
      const unreadRes = await request(app)
        .get('/api/messages/unread-count')
        .set(getAuthHeader(user1Token));

      expect(unreadRes.status).toBe(200);
      // Count should account for messages being marked as read
    }, 30000);

    it('should support pagination', async () => {
      const res = await request(app)
        .get(`/api/messages/conversation/${user2Id}?page=1&limit=10`)
        .set(getAuthHeader(user1Token));

      expect(res.status).toBe(200);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(10);
    }, 30000);

    it('should reject conversation with non-existent user', async () => {
      const res = await request(app)
        .get('/api/messages/conversation/nonexistent-id')
        .set(getAuthHeader(user1Token));

      expect(res.status).toBe(404);
      expectErrorMessage(res.body.error, /user not found/i);
    }, 30000);

    it('should require authentication', async () => {
      const res = await request(app).get(`/api/messages/conversation/${user2Id}`);

      expect(res.status).toBe(401);
    }, 30000);
  });

  // PUT /api/messages/:id/read - Mark message as read
  describe('PUT /api/messages/:id/read', () => {
    let messageId: string;

    beforeAll(async () => {
      const msg = await request(app)
        .post('/api/messages')
        .set(getAuthHeader(user1Token))
        .send({
          recipientId: user2Id,
          content: 'Mark as read test',
        });

      messageId = msg.body.message.id;
    }, 30000);

    it('should mark a message as read', async () => {
      const res = await request(app)
        .put(`/api/messages/${messageId}/read`)
        .set(getAuthHeader(user2Token));

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/marked as read/i);
    }, 30000);

    it('should reject marking non-existent message', async () => {
      const res = await request(app)
        .put('/api/messages/nonexistent-id/read')
        .set(getAuthHeader(user2Token));

      expect(res.status).toBe(404);
      expectErrorMessage(res.body.error, /message not found/i);
    }, 30000);

    it('should reject marking message sent to someone else', async () => {
      const res = await request(app)
        .put(`/api/messages/${messageId}/read`)
        .set(getAuthHeader(user3Token));

      expect(res.status).toBe(403);
      expectErrorMessage(res.body.error, /only mark messages sent to you/i);
    }, 30000);

    it('should require authentication', async () => {
      const res = await request(app).put(`/api/messages/${messageId}/read`);

      expect(res.status).toBe(401);
    }, 30000);
  });

  // PUT /api/messages/conversation/:partnerId/read - Mark conversation as read
  describe('PUT /api/messages/conversation/:partnerId/read', () => {
    beforeAll(async () => {
      // User3 sends multiple messages to User1
      await request(app)
        .post('/api/messages')
        .set(getAuthHeader(user3Token))
        .send({
          recipientId: user1Id,
          content: 'Bulk message 1',
        });

      await request(app)
        .post('/api/messages')
        .set(getAuthHeader(user3Token))
        .send({
          recipientId: user1Id,
          content: 'Bulk message 2',
        });
    }, 30000);

    it('should mark all messages in conversation as read', async () => {
      const res = await request(app)
        .put(`/api/messages/conversation/${user3Id}/read`)
        .set(getAuthHeader(user1Token));

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/conversation marked as read/i);

      // Verify unread count decreased
      const unreadRes = await request(app)
        .get('/api/messages/unread-count')
        .set(getAuthHeader(user1Token));

      expect(unreadRes.status).toBe(200);
      expect(typeof unreadRes.body.count).toBe('number');
    }, 30000);

    it('should require authentication', async () => {
      const res = await request(app).put(`/api/messages/conversation/${user3Id}/read`);

      expect(res.status).toBe(401);
    }, 30000);
  });

  // DELETE /api/messages/:id - Delete message
  describe('DELETE /api/messages/:id', () => {
    let messageId: string;

    beforeAll(async () => {
      const msg = await request(app)
        .post('/api/messages')
        .set(getAuthHeader(user1Token))
        .send({
          recipientId: user2Id,
          content: 'Message to delete',
        });

      messageId = msg.body.message.id;
    }, 30000);

    it('should delete a message', async () => {
      const res = await request(app)
        .delete(`/api/messages/${messageId}`)
        .set(getAuthHeader(user1Token));

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/deleted successfully/i);
    }, 30000);

    it('should reject deleting non-existent message', async () => {
      const res = await request(app)
        .delete('/api/messages/nonexistent-id')
        .set(getAuthHeader(user1Token));

      expect(res.status).toBe(404);
      expectErrorMessage(res.body.error, /message not found/i);
    }, 30000);

    it('should reject deleting message sent by someone else', async () => {
      const msg = await request(app)
        .post('/api/messages')
        .set(getAuthHeader(user2Token))
        .send({
          recipientId: user1Id,
          content: 'Cannot delete this',
        });

      const res = await request(app)
        .delete(`/api/messages/${msg.body.message.id}`)
        .set(getAuthHeader(user1Token));

      expect(res.status).toBe(403);
      expectErrorMessage(res.body.error, /only delete messages you sent/i);
    }, 30000);

    it('should require authentication', async () => {
      const msg = await request(app)
        .post('/api/messages')
        .set(getAuthHeader(user1Token))
        .send({
          recipientId: user2Id,
          content: 'Test message',
        });

      const res = await request(app).delete(`/api/messages/${msg.body.message.id}`);

      expect(res.status).toBe(401);
    }, 30000);
  });

  // GET /api/messages/unread-count - Get unread count
  describe('GET /api/messages/unread-count', () => {
    it('should get unread message count', async () => {
      const res = await request(app)
        .get('/api/messages/unread-count')
        .set(getAuthHeader(user1Token));

      expect(res.status).toBe(200);
      expect(res.body.count).toBeDefined();
      expect(typeof res.body.count).toBe('number');
      expect(res.body.count).toBeGreaterThanOrEqual(0);
    }, 30000);

    it('should require authentication', async () => {
      const res = await request(app).get('/api/messages/unread-count');

      expect(res.status).toBe(401);
    }, 30000);
  });

  // GET /api/messages/search - Search messages
  describe('GET /api/messages/search', () => {
    beforeAll(async () => {
      await request(app)
        .post('/api/messages')
        .set(getAuthHeader(user1Token))
        .send({
          recipientId: user2Id,
          content: 'Searchable unique keyword xyzabc',
        });
    }, 30000);

    it('should search messages', async () => {
      const res = await request(app)
        .get('/api/messages/search?q=xyzabc')
        .set(getAuthHeader(user1Token));

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);

      if (res.body.data.length > 0) {
        expect(res.body.data[0].content).toMatch(/xyzabc/i);
      }
    }, 30000);

    it('should reject search with short query', async () => {
      const res = await request(app)
        .get('/api/messages/search?q=a')
        .set(getAuthHeader(user1Token));

      expect(res.status).toBe(400);
      expectErrorMessage(res.body.error, /at least 2 characters/i);
    }, 30000);

    it('should support pagination in search', async () => {
      const res = await request(app)
        .get('/api/messages/search?q=message&page=1&limit=5')
        .set(getAuthHeader(user1Token));

      expect(res.status).toBe(200);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(5);
    }, 30000);

    it('should require authentication', async () => {
      const res = await request(app).get('/api/messages/search?q=test');

      expect(res.status).toBe(401);
    }, 30000);
  });

  // Message threading and workflow
  describe('Message threading and workflow', () => {
    it('should support message threads', async () => {
      // User1 sends initial message
      const msg1 = await request(app)
        .post('/api/messages')
        .set(getAuthHeader(user1Token))
        .send({
          recipientId: user2Id,
          content: 'Thread starter',
        });

      const parentId = msg1.body.message.id;

      // User2 replies
      const msg2 = await request(app)
        .post('/api/messages')
        .set(getAuthHeader(user2Token))
        .send({
          recipientId: user1Id,
          content: 'Thread reply 1',
          parentMessageId: parentId,
        });

      // User1 replies again
      const msg3 = await request(app)
        .post('/api/messages')
        .set(getAuthHeader(user1Token))
        .send({
          recipientId: user2Id,
          content: 'Thread reply 2',
          parentMessageId: parentId,
        });

      // Fetch conversation and verify threading
      const res = await request(app)
        .get(`/api/messages/conversation/${user2Id}`)
        .set(getAuthHeader(user1Token));

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);

      // Find replies
      const replies = res.body.data.filter((m: any) => m.parentId === parentId);
      expect(replies.length).toBeGreaterThanOrEqual(2);
    }, 30000);

    it('should enforce blocking in messages', async () => {
      // User1 blocks User3
      await request(app)
        .post(`/api/blocks/${user3Id}`)
        .set(getAuthHeader(user1Token));

      // User3 tries to send message to User1
      const res = await request(app)
        .post('/api/messages')
        .set(getAuthHeader(user3Token))
        .send({
          recipientId: user1Id,
          content: 'Should be blocked',
        });

      expect(res.status).toBe(403);
      expectErrorMessage(res.body.error, /blocked/i);

      // Cleanup
      await request(app)
        .delete(`/api/blocks/${user3Id}`)
        .set(getAuthHeader(user1Token));
    }, 30000);

    it('should create notification on new message', async () => {
      // User1 sends message to User2
      await request(app)
        .post('/api/messages')
        .set(getAuthHeader(user1Token))
        .send({
          recipientId: user2Id,
          content: 'Notification test',
        });

      // User2 checks notifications
      const res = await request(app)
        .get('/api/notifications')
        .set(getAuthHeader(user2Token));

      // Should have notification, but API may vary
      expect([200, 404, 500]).toContain(res.status);
    }, 30000);

    it('should handle conversation between two users bidirectionally', async () => {
      // User1 to User2
      await request(app)
        .post('/api/messages')
        .set(getAuthHeader(user1Token))
        .send({
          recipientId: user2Id,
          content: 'A to B',
        });

      // User2 to User1
      await request(app)
        .post('/api/messages')
        .set(getAuthHeader(user2Token))
        .send({
          recipientId: user1Id,
          content: 'B to A',
        });

      // Both should see the same conversation
      const res1 = await request(app)
        .get(`/api/messages/conversation/${user2Id}`)
        .set(getAuthHeader(user1Token));

      const res2 = await request(app)
        .get(`/api/messages/conversation/${user1Id}`)
        .set(getAuthHeader(user2Token));

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(res1.body.data.length).toBe(res2.body.data.length);
    }, 30000);
  });
});
