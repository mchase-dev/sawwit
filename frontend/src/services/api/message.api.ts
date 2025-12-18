import axios from '../../lib/axios';

export interface SendMessageData {
  recipientId: string;
  content: string;
  parentId?: string;
}

export const messageApi = {
  send: async (data: SendMessageData) => {
    const response = await axios.post('/messages', data);
    return response.data.message;
  },

  getConversations: async (page: number = 1, limit: number = 20) => {
    const response = await axios.get('/messages/conversations', {
      params: { page, limit },
    });
    return response.data;
  },

  getConversation: async (userId: string, page: number = 1, limit: number = 20) => {
    const response = await axios.get(`/messages/conversation/${userId}`, {
      params: { page, limit },
    });
    return response.data;
  },

  markAsRead: async (userId: string) => {
    const response = await axios.put(`/messages/conversation/${userId}/read`);
    return response.data;
  },

  deleteConversation: async (userId: string) => {
    const response = await axios.delete(`/messages/conversation/${userId}`);
    return response.data;
  },

  deleteMessage: async (id: string) => {
    const response = await axios.delete(`/messages/${id}`);
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await axios.get('/messages/unread-count');
    return response.data.count;
  },

  search: async (query: string, page: number = 1, limit: number = 20) => {
    const response = await axios.get('/messages/search', {
      params: { q: query, page, limit },
    });
    return response.data;
  },
};
