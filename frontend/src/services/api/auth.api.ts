import axios from '../../lib/axios';

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  agreedToTerms: boolean;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: any;
  accessToken: string;
  refreshToken: string;
}

export const authApi = {
  /**
   * Register a new user
   */
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await axios.post('/auth/register', data);
    return response.data;
  },

  /**
   * Login with email and password
   */
  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await axios.post('/auth/login', data);
    return response.data;
  },

  /**
   * Refresh access token
   */
  refreshToken: async (refreshToken: string) => {
    const response = await axios.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  /**
   * Get current user profile
   */
  getCurrentUser: async () => {
    const response = await axios.get('/auth/me');
    return response.data.user;
  },

  /**
   * Logout
   */
  logout: async () => {
    const response = await axios.post('/auth/logout');
    return response.data;
  },
};
