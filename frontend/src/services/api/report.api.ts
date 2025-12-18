import axios from '../../lib/axios';

export const reportApi = {
  create: async (data: {
    targetType: 'POST' | 'COMMENT' | 'USER';
    targetId: string;
    reason: string;
    details?: string;
  }) => {
    const response = await axios.post('/reports', {
      type: data.targetType.toLowerCase(),
      targetId: data.targetId,
      reason: data.reason,
      details: data.details,
    });
    return response.data.report;
  },

  getQueue: async (page: number = 1, limit: number = 20) => {
    const response = await axios.get('/reports/queue', {
      params: { page, limit },
    });
    return response.data;
  },

  getAll: async (topicId?: string, status?: string, page: number = 1, limit: number = 20) => {
    const response = await axios.get('/reports', {
      params: { topicId, status, page, limit },
    });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await axios.get(`/reports/${id}`);
    return response.data.report;
  },

  resolve: async (id: string, resolution?: string) => {
    const response = await axios.put(`/reports/${id}/resolve`, { resolution });
    return response.data.report;
  },

  dismiss: async (id: string, resolution?: string) => {
    const response = await axios.put(`/reports/${id}/dismiss`, { resolution });
    return response.data.report;
  },
};
