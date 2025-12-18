import { useQuery } from '@tanstack/react-query';
import { trendingApi } from '../services/api/trending.api';

export const useTrendingTopics = (limit: number = 5) => {
  return useQuery({
    queryKey: ['trending', 'topics', limit],
    queryFn: () => trendingApi.getTopics(limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useTrendingPosts = (limit: number = 10) => {
  return useQuery({
    queryKey: ['trending', 'posts', limit],
    queryFn: () => trendingApi.getPosts(limit),
    staleTime: 5 * 60 * 1000,
  });
};
