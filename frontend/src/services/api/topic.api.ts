import axios from '../../lib/axios';

export interface CreateTopicData {
  displayName: string;
  description: string;
  rules?: string;
}

export interface UpdateTopicData {
  displayName?: string;
  description?: string;
  rules?: string;
}

export const topicApi = {
  /**
   * Get all topics with pagination
   */
  getAll: async (page: number = 1, limit: number = 20, sort: 'popular' | 'new' | 'active' = 'popular') => {
    const response = await axios.get('/topics', {
      params: { page, limit, sort },
    });
    return response.data;
  },

  /**
   * Create a new topic
   */
  create: async (data: CreateTopicData) => {
    const response = await axios.post('/topics', data);
    return response.data.topic;
  },

  /**
   * Get topic by name
   */
  getByName: async (name: string) => {
    const response = await axios.get(`/topics/${name}`);
    return response.data.topic;
  },

  /**
   * Update topic
   */
  update: async (name: string, data: UpdateTopicData) => {
    const response = await axios.put(`/topics/${name}`, data);
    return response.data.topic;
  },

  /**
   * Delete topic
   */
  delete: async (name: string) => {
    const response = await axios.delete(`/topics/${name}`);
    return response.data;
  },

  /**
   * Join a topic
   */
  join: async (name: string) => {
    const response = await axios.post(`/topics/${name}/join`);
    return response.data;
  },

  /**
   * Leave a topic
   */
  leave: async (name: string) => {
    const response = await axios.post(`/topics/${name}/leave`);
    return response.data;
  },

  /**
   * Get posts in a topic
   */
  getPosts: async (name: string, page: number = 1, limit: number = 20, sort: string = 'hot') => {
    const response = await axios.get(`/topics/${name}/posts`, {
      params: { page, limit, sort },
    });
    return response.data;
  },

  /**
   * Create post in a topic
   */
  createPost: async (name: string, data: any) => {
    const response = await axios.post(`/topics/${name}/posts`, data);
    return response.data.post;
  },

  /**
   * Appoint a moderator
   */
  appointModerator: async (name: string, userId: string) => {
    const response = await axios.post(`/topics/${name}/moderators`, { userId });
    return response.data;
  },

  /**
   * Remove a moderator
   */
  removeModerator: async (name: string, userId: string) => {
    const response = await axios.delete(`/topics/${name}/moderators/${userId}`);
    return response.data;
  },

  /**
   * Ban a user
   */
  banUser: async (name: string, data: { userId: string; reason?: string; duration?: number }) => {
    const response = await axios.post(`/topics/${name}/ban`, data);
    return response.data;
  },

  /**
   * Unban a user
   */
  unbanUser: async (name: string, userId: string) => {
    const response = await axios.post(`/topics/${name}/unban`, { userId });
    return response.data;
  },

  /**
   * Get banned users in a topic
   */
  getBannedUsers: async (name: string) => {
    const response = await axios.get(`/topics/${name}/banned`);
    return response.data.bannedUsers;
  },

  /**
   * Get user's topic memberships
   */
  getUserMemberships: async () => {
    const response = await axios.get('/topics/user/memberships');
    return response.data.topics;
  },

  /**
   * Get topics user moderates
   */
  getModeratedTopics: async () => {
    const response = await axios.get('/topics/user/moderated');
    return response.data.topics;
  },
};
