import { useQuery } from '@tanstack/react-query';
import { modLogApi } from '../services/api/modlog.api';

export const useModLog = (
  topicId?: string,
  action?: string,
  page: number = 1,
  limit: number = 50
) => {
  return useQuery({
    queryKey: ['modLog', topicId, action, page],
    queryFn: () => modLogApi.getLogs(topicId, action, page, limit),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useModLogStats = (topicId?: string) => {
  return useQuery({
    queryKey: ['modLog', 'stats', topicId],
    queryFn: () => modLogApi.getStats(topicId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
