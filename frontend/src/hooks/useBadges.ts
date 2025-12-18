import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { badgeApi } from '../services/api/badge.api';
import { toast } from 'sonner';

export const useUserBadgeInTopic = (userId: string, topicId: string) => {
  return useQuery({
    queryKey: ['badge', userId, topicId],
    queryFn: () => badgeApi.getUserBadgeInTopic(userId, topicId),
    enabled: !!userId && !!topicId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useTopicBadges = (topicId: string) => {
  return useQuery({
    queryKey: ['topic', topicId, 'badges'],
    queryFn: () => badgeApi.getTopicBadges(topicId),
    enabled: !!topicId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useAwardBadge = (topicId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { userId: string; text: string; textColor?: string; bgColor?: string }) =>
      badgeApi.award({ ...data, topicId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topic', topicId, 'badges'] });
      toast.success('Badge awarded!');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to award badge';
      toast.error(errorMessage);
    },
  });
};

export const useRemoveBadge = (topicId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => badgeApi.remove(topicId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topic', topicId, 'badges'] });
      toast.success('Badge removed');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to remove badge';
      toast.error(errorMessage);
    },
  });
};
