import axios from '../../lib/axios';

export interface UpdateProfileData {
  displayName?: string;
  bio?: string;
  website?: string;
}

export interface UpdatePasswordData {
  oldPassword: string;
  newPassword: string;
}

export interface UpdateAvatarData {
  avatarStyle: string;
  avatarSeed?: string;
}

export interface DeleteAccountData {
  password: string;
  confirmText: string;
}

export const userApi = {
  /**
   * Get user by username
   */
  getByUsername: async (username: string) => {
    const response = await axios.get(`/users/${username}`);
    return response.data.user;
  },

  /**
   * Get user profile (alias for getByUsername)
   */
  getProfile: async (username: string) => {
    const response = await axios.get(`/users/${username}`);
    return response.data.user;
  },

  /**
   * Update current user profile
   */
  updateProfile: async (data: UpdateProfileData) => {
    const response = await axios.put('/users/me', data);
    return response.data.user;
  },

  /**
   * Update password
   */
  updatePassword: async (data: UpdatePasswordData | { currentPassword: string; newPassword: string }) => {
    const apiData = 'currentPassword' in data
      ? { oldPassword: data.currentPassword, newPassword: data.newPassword }
      : data;
    const response = await axios.put('/users/me/password', apiData);
    return response.data;
  },

  /**
   * Update avatar
   */
  updateAvatar: async (data: UpdateAvatarData) => {
    const response = await axios.put('/users/me/avatar', data);
    return response.data.user;
  },

  /**
   * Get user's posts
   */
  getUserPosts: async (username: string, page: number = 1, limit: number = 20) => {
    const response = await axios.get(`/users/${username}/posts`, {
      params: { page, limit },
    });
    return response.data;
  },

  /**
   * Get user's comments
   */
  getUserComments: async (username: string, page: number = 1, limit: number = 20) => {
    const response = await axios.get(`/users/${username}/comments`, {
      params: { page, limit },
    });
    return response.data;
  },

  /**
   * Get saved posts
   */
  getSavedPosts: async (page: number = 1, limit: number = 20) => {
    const response = await axios.get('/users/me/saved', {
      params: { page, limit },
    });
    return response.data;
  },

  /**
   * Clear all saved posts
   */
  clearSavedPosts: async () => {
    const response = await axios.delete('/users/me/saved');
    return response.data;
  },

  /**
   * Send email verification
   */
  sendEmailVerification: async () => {
    const response = await axios.post('/users/me/verify-email');
    return response.data;
  },

  /**
   * Upload avatar
   */
  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await axios.post('/users/me/avatar/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.user;
  },

  /**
   * Delete account
   */
  deleteAccount: async (data: DeleteAccountData) => {
    const response = await axios.delete('/users/me', { data });
    return response.data;
  },
};
