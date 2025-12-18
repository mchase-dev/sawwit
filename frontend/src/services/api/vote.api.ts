import axios from '../../lib/axios';

export const voteApi = {
  /**
   * Upvote a post or comment
   */
  upvote: async (postId?: string, commentId?: string) => {
    const response = await axios.post('/votes/upvote', { postId, commentId });
    return response.data;
  },

  /**
   * Downvote a post or comment
   */
  downvote: async (postId?: string, commentId?: string) => {
    const response = await axios.post('/votes/downvote', { postId, commentId });
    return response.data;
  },

  /**
   * Remove vote
   */
  removeVote: async (postId?: string, commentId?: string) => {
    const response = await axios.delete('/votes', {
      data: { postId, commentId },
    });
    return response.data;
  },

  /**
   * Get user's vote
   */
  getUserVote: async (postId?: string, commentId?: string) => {
    const response = await axios.get('/votes', {
      params: { postId, commentId },
    });
    return response.data.vote;
  },
};
