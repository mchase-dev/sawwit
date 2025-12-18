import axios from '../../lib/axios';

export const modLogApi = {
  getLogs: async (topicId?: string, action?: string, page: number = 1, limit: number = 20) => {
    const params: Record<string, any> = { page, limit };
    if (topicId) params.topicId = topicId;
    if (action) params.action = action;

    const response = await axios.get('/modlog', { params });
    return response.data;
  },

  getTopicLogs: async (topicName: string, page: number = 1, limit: number = 20) => {
    const response = await axios.get(`/modlog/topic/${topicName}`, {
      params: { page, limit },
    });
    return response.data;
  },

  getByModerator: async (moderatorId: string, page: number = 1, limit: number = 20) => {
    const response = await axios.get(`/modlog/moderator/${moderatorId}`, {
      params: { page, limit },
    });
    return response.data;
  },

  getByUser: async (userId: string, page: number = 1, limit: number = 20) => {
    const response = await axios.get(`/modlog/user/${userId}`, {
      params: { page, limit },
    });
    return response.data;
  },

  getStats: async (topicId?: string) => {
    const response = await axios.get('/modlog/statistics', {
      params: topicId ? { topicId } : undefined,
    });
    return response.data;
  },
};
