import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { topicApi } from '../services/api/topic.api';
import { toast } from 'sonner';

export const useTopic = (topicName: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['topic', topicName],
    queryFn: () => topicApi.getByName(topicName),
    enabled: !!topicName && enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useTopics = (
  page: number = 1,
  limit: number = 20,
  sort: 'popular' | 'new' | 'active' = 'popular'
) => {
  return useQuery({
    queryKey: ['topics', page, sort],
    queryFn: () => topicApi.getAll(page, limit, sort),
    staleTime: 2 * 60 * 1000,
  });
};

export const useTopicPosts = (
  topicName: string,
  page: number = 1,
  limit: number = 20,
  sort: 'hot' | 'new' | 'top' = 'hot'
) => {
  return useQuery({
    queryKey: ['topic', topicName, 'posts', sort, page],
    queryFn: () => topicApi.getPosts(topicName, page, limit, sort),
    enabled: !!topicName,
  });
};

export const useUserMemberships = () => {
  return useQuery({
    queryKey: ['topics', 'memberships'],
    queryFn: () => topicApi.getUserMemberships(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateTopic = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { displayName: string; description: string; rules?: string; isNSFW?: boolean }) =>
      topicApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      toast.success('Topic created successfully!');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to create topic';
      toast.error(errorMessage);
    },
  });
};

export const useJoinTopic = (topicName: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => topicApi.join(topicName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topic', topicName] });
      queryClient.invalidateQueries({ queryKey: ['topics', 'memberships'] });
      toast.success('Joined topic!');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to join topic';
      toast.error(errorMessage);
    },
  });
};

export const useLeaveTopic = (topicName: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => topicApi.leave(topicName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topic', topicName] });
      queryClient.invalidateQueries({ queryKey: ['topics', 'memberships'] });
      toast.success('Left topic');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to leave topic';
      toast.error(errorMessage);
    },
  });
};

export const useUpdateTopic = (topicName: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { displayName?: string; description?: string; rules?: string }) =>
      topicApi.update(topicName, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topic', topicName] });
      toast.success('Topic updated successfully!');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to update topic';
      toast.error(errorMessage);
    },
  });
};

export const useBanUser = (topicName: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { userId: string; reason?: string; duration?: number }) =>
      topicApi.banUser(topicName, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topic', topicName, 'banned'] });
      toast.success('User banned');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to ban user';
      toast.error(errorMessage);
    },
  });
};

export const useUnbanUser = (topicName: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => topicApi.unbanUser(topicName, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topic', topicName, 'banned'] });
      toast.success('User unbanned');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to unban user';
      toast.error(errorMessage);
    },
  });
};
