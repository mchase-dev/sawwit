import axios from '../../lib/axios';

export const blockApi = {
  block: async (userId: string) => {
    const response = await axios.post('/blocks', { blockedUserId: userId });
    return response.data.block;
  },

  unblock: async (userId: string) => {
    const response = await axios.delete(`/blocks/${userId}`);
    return response.data;
  },

  getBlocked: async (page: number = 1, limit: number = 20) => {
    const response = await axios.get('/blocks', {
      params: { page, limit },
    });
    return response.data;
  },

  isBlocked: async (userId: string) => {
    const response = await axios.get(`/blocks/${userId}/check`);
    return response.data.isBlocked;
  },

  getCount: async () => {
    const response = await axios.get('/blocks/count');
    return response.data.count;
  },
};
