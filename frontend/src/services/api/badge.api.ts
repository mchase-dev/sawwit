import axios from '../../lib/axios';

export const badgeApi = {
  /**
   * Get all badges for a user across all topics
   */
  getUserBadges: async (userId: string) => {
    const response = await axios.get(`/badges/user/${userId}`);
    return response.data.badges;
  },

  /**
   * Get badge for user in specific topic
   */
  getUserBadgeInTopic: async (userId: string, topicId: string) => {
    const response = await axios.get(`/badges/user/${userId}/topic/${topicId}`);
    return response.data.badge;
  },

  /**
   * Get all badges in a topic
   */
  getTopicBadges: async (topicId: string) => {
    const response = await axios.get(`/badges/topic/${topicId}`);
    return response.data;
  },

  /**
   * Award a badge to a user in a topic
   */
  award: async (data: { topicId: string; userId: string; text: string; textColor?: string; bgColor?: string }) => {
    const response = await axios.post('/badges', data);
    return response.data.badge;
  },

  /**
   * Remove a badge from a user in a topic
   */
  remove: async (topicId: string, userId: string) => {
    const response = await axios.delete(`/badges/topic/${topicId}/user/${userId}`);
    return response.data;
  },
};
