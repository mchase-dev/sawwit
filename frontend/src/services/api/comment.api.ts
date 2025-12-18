import axios from '../../lib/axios';

export const commentApi = {
  /**
   * Get comments for a post
   */
  getPostComments: async (postId: string, sort: string = 'best') => {
    const response = await axios.get(`/posts/${postId}/comments`, {
      params: { sort },
    });
    return response.data.comments;
  },

  /**
   * Create a comment on a post
   */
  create: async (postId: string, data: { content: string; parentId?: string }) => {
    const response = await axios.post(`/posts/${postId}/comments`, data);
    return response.data.comment;
  },

  /**
   * Get comment by ID
   */
  getById: async (id: string) => {
    const response = await axios.get(`/comments/${id}`);
    return response.data.comment;
  },

  /**
   * Update a comment
   */
  update: async (id: string, data: { content: string }) => {
    const response = await axios.put(`/comments/${id}`, data);
    return response.data.comment;
  },

  /**
   * Delete a comment
   */
  delete: async (id: string) => {
    const response = await axios.delete(`/comments/${id}`);
    return response.data;
  },
};
