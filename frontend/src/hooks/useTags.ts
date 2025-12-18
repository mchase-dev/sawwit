import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tagApi } from '../services/api/tag.api';
import { toast } from 'sonner';

export const useTopicTags = (topicId: string) => {
  return useQuery({
    queryKey: ['topic', topicId, 'tags'],
    queryFn: () => tagApi.getTopicTags(topicId),
    enabled: !!topicId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateTag = (topicId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { text: string; textColor?: string; bgColor?: string }) =>
      tagApi.create(topicId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topic', topicId, 'tags'] });
      toast.success('Tag created!');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to create tag';
      toast.error(errorMessage);
    },
  });
};

export const useUpdateTag = (topicId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tagId, data }: { tagId: string; data: { text?: string; textColor?: string; bgColor?: string } }) =>
      tagApi.update(tagId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topic', topicId, 'tags'] });
      toast.success('Tag updated!');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to update tag';
      toast.error(errorMessage);
    },
  });
};

export const useDeleteTag = (topicId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tagId: string) => tagApi.delete(tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topic', topicId, 'tags'] });
      toast.success('Tag deleted');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to delete tag';
      toast.error(errorMessage);
    },
  });
};
