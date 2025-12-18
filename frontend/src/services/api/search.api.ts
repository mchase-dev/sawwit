import axios from '../../lib/axios';

export const searchApi = {
  global: async (query: string, page: number = 1, limit: number = 20) => {
    const response = await axios.get('/search', {
      params: { q: query, page, limit },
    });
    return response.data;
  },

  topicPosts: async (topicName: string, query: string, page: number = 1, limit: number = 20) => {
    const response = await axios.get(`/search/topic/${topicName}`, {
      params: { q: query, page, limit },
    });
    return response.data;
  },
};
