import axios from '../../lib/axios';

export const notificationApi = {
  /**
   * Get notifications
   */
  getAll: async (page: number = 1, limit: number = 20, status?: 'read' | 'unread') => {
    const response = await axios.get('/notifications', {
      params: { page, limit, status },
    });
    return response.data;
  },

  /**
   * Get unread count
   */
  getUnreadCount: async () => {
    const response = await axios.get('/notifications/unread-count');
    return response.data.count;
  },

  /**
   * Mark notification as read
   */
  markAsRead: async (id: string) => {
    const response = await axios.put(`/notifications/${id}/read`);
    return response.data;
  },

  /**
   * Mark all as read
   */
  markAllAsRead: async () => {
    const response = await axios.put('/notifications/read-all');
    return response.data;
  },

  /**
   * Delete notification
   */
  delete: async (id: string) => {
    const response = await axios.delete(`/notifications/${id}`);
    return response.data;
  },

  /**
   * Delete all read notifications
   */
  deleteAllRead: async () => {
    const response = await axios.delete('/notifications/read-all');
    return response.data;
  },
};
