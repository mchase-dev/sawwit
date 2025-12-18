import axios from '../../lib/axios';

export interface CreateTagData {
  topicId: string;
  name: string;
  color?: string;
  description?: string;
}

export const tagApi = {
  getTopicTags: async (topicId: string) => {
    const response = await axios.get(`/tags/topic/${topicId}`);
    return response.data;
  },

  create: async (topicId: string, data: { text: string; textColor?: string; bgColor?: string }) => {
    const response = await axios.post('/tags', {
      topicId,
      name: data.text,
      color: data.bgColor,
    });
    return response.data.tag;
  },

  getById: async (id: string) => {
    const response = await axios.get(`/tags/${id}`);
    return response.data.tag;
  },

  update: async (id: string, data: { text?: string; textColor?: string; bgColor?: string }) => {
    const response = await axios.put(`/tags/${id}`, {
      name: data.text,
      color: data.bgColor,
    });
    return response.data.tag;
  },

  delete: async (id: string) => {
    const response = await axios.delete(`/tags/${id}`);
    return response.data;
  },

  getPostsByTag: async (id: string, page: number = 1, limit: number = 20) => {
    const response = await axios.get(`/tags/${id}/posts`, {
      params: { page, limit },
    });
    return response.data;
  },
};
