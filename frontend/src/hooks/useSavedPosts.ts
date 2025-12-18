import { useQuery } from '@tanstack/react-query';
import { userApi } from '../services/api/user.api';

export const useSavedPosts = (page: number = 1, limit: number = 20) => {
  return useQuery({
    queryKey: ['savedPosts', page],
    queryFn: () => userApi.getSavedPosts(page, limit),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};
