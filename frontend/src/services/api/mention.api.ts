import axios from '../../lib/axios';

export const mentionApi = {
  getUserMentions: async (page: number = 1, limit: number = 20) => {
    const response = await axios.get('/mentions', {
      params: { page, limit },
    });
    return response.data;
  },

  getPostMentions: async (postId: string, page: number = 1, limit: number = 20) => {
    const response = await axios.get(`/mentions/post/${postId}`, {
      params: { page, limit },
    });
    return response.data;
  },

  getCommentMentions: async (commentId: string, page: number = 1, limit: number = 20) => {
    const response = await axios.get(`/mentions/comment/${commentId}`, {
      params: { page, limit },
    });
    return response.data;
  },

  getCount: async () => {
    const response = await axios.get('/mentions/count');
    return response.data.count;
  },

  getTopMentioners: async (limit: number = 10) => {
    const response = await axios.get('/mentions/top/mentioners', {
      params: { limit },
    });
    return response.data;
  },

  getTopMentioned: async (limit: number = 10) => {
    const response = await axios.get('/mentions/top/mentioned', {
      params: { limit },
    });
    return response.data;
  },
};
