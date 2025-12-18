import axios from '../../lib/axios';

export const trendingApi = {
  getTopics: async (limit: number = 10, forceRefresh: boolean = false) => {
    const response = await axios.get('/trending/topics', {
      params: { limit, refresh: forceRefresh },
    });
    return response.data.topics;
  },

  getPosts: async (limit: number = 20, forceRefresh: boolean = false) => {
    const response = await axios.get('/trending/posts', {
      params: { limit, refresh: forceRefresh },
    });
    return response.data.posts;
  },

  getTopicPosts: async (topicId: string, limit: number = 20) => {
    const response = await axios.get(`/trending/posts/topic/${topicId}`, {
      params: { limit },
    });
    return response.data.posts;
  },

  clearCache: async () => {
    const response = await axios.post('/trending/cache/clear');
    return response.data;
  },

  getCacheStatus: async () => {
    const response = await axios.get('/trending/cache/status');
    return response.data.status;
  },
};
