import axios from '../../lib/axios';

export interface CreatePostData {
  title: string;
  content: string;
  type?: 'TEXT' | 'LINK' | 'IMAGE';
  linkUrl?: string;
  imageUrl?: string;
  isNSFW?: boolean;
  isSpoiler?: boolean;
  tagId?: string;
}

export interface UpdatePostData {
  title?: string;
  content?: string;
  isNSFW?: boolean;
  isSpoiler?: boolean;
  tagId?: string;
}

export const postApi = {
  /**
   * Get post by ID or slug
   */
  getById: async (identifier: string) => {
    const response = await axios.get(`/posts/${identifier}`);
    return response.data.post;
  },

  /**
   * Create a post in a topic
   */
  create: async (topicName: string, data: CreatePostData) => {
    const response = await axios.post(`/topics/${topicName}/posts`, data);
    return response.data.post;
  },

  /**
   * Update a post
   */
  update: async (id: string, data: UpdatePostData) => {
    const response = await axios.put(`/posts/${id}`, data);
    return response.data.post;
  },

  /**
   * Delete a post
   */
  delete: async (id: string) => {
    const response = await axios.delete(`/posts/${id}`);
    return response.data;
  },

  /**
   * Get comments for a post
   */
  getComments: async (id: string, sort: string = 'best') => {
    const response = await axios.get(`/posts/${id}/comments`, {
      params: { sort },
    });
    return response.data.comments;
  },

  /**
   * Create a comment on a post
   */
  createComment: async (id: string, content: string, parentId?: string) => {
    const response = await axios.post(`/posts/${id}/comments`, {
      content,
      parentId,
    });
    return response.data.comment;
  },

  /**
   * Save a post
   */
  save: async (id: string) => {
    const response = await axios.post(`/posts/${id}/save`);
    return response.data;
  },

  /**
   * Unsave a post
   */
  unsave: async (id: string) => {
    const response = await axios.delete(`/posts/${id}/save`);
    return response.data;
  },

  /**
   * Pin a post
   */
  pin: async (id: string) => {
    const response = await axios.post(`/posts/${id}/pin`);
    return response.data;
  },

  /**
   * Unpin a post
   */
  unpin: async (id: string) => {
    const response = await axios.delete(`/posts/${id}/pin`);
    return response.data;
  },

  /**
   * Lock a post
   */
  lock: async (id: string) => {
    const response = await axios.post(`/posts/${id}/lock`);
    return response.data;
  },

  /**
   * Unlock a post
   */
  unlock: async (id: string) => {
    const response = await axios.delete(`/posts/${id}/lock`);
    return response.data;
  },
};
