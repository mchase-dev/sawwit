import { useQuery } from '@tanstack/react-query';
import { mentionApi } from '../services/api/mention.api';

export const useUserMentions = (page: number = 1, limit: number = 20) => {
  return useQuery({
    queryKey: ['mentions', page],
    queryFn: () => mentionApi.getUserMentions(page, limit),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useTopMentioners = (limit: number = 10) => {
  return useQuery({
    queryKey: ['mentions', 'top', limit],
    queryFn: () => mentionApi.getTopMentioners(limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
