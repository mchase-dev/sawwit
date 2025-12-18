import axios from '../../lib/axios';

export const adminApi = {
  /**
   * Get admin dashboard statistics
   * Note: This aggregates data from multiple endpoints since there's no dedicated admin stats endpoint yet
   */
  getStats: async () => {
    // For now, we'll need to aggregate from multiple endpoints
    // This is a placeholder that can be replaced with a proper admin stats endpoint later
    const response = await axios.get('/reports', { params: { status: 'pending', limit: 1 } });

    return {
      totalUsers: 0, // Would need a user count endpoint
      totalPosts: 0, // Would need a post count endpoint
      totalComments: 0, // Would need a comment count endpoint
      pendingReports: response.data.pagination?.total || 0,
      activeModerators: 0, // Would need a moderator count endpoint
    };
  },

  /**
   * Get recent activity
   * Note: This is a placeholder - would need a proper activity feed endpoint
   */
  getRecentActivity: async () => {
    return [];
  },
};
