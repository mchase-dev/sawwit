import axios from '../../lib/axios';

export const feedApi = {
  getHomeFeed: async (page: number = 1, limit: number = 20) => {
    const response = await axios.get('/feed/home', {
      params: { page, limit },
    });
    return response.data;
  },

  getAllFeed: async (page: number = 1, limit: number = 20, includeNsfw: boolean = false) => {
    const response = await axios.get('/feed/all', {
      params: { page, limit, includeNsfw },
    });
    return response.data;
  },
};
