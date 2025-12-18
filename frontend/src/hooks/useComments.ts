import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commentApi } from '../services/api/comment.api';
import { voteApi } from '../services/api/vote.api';
import { toast } from 'sonner';

export const usePostComments = (postId: string, sort: 'best' | 'top' | 'new' | 'old' | 'controversial' = 'best') => {
  return useQuery({
    queryKey: ['post', postId, 'comments', sort],
    queryFn: () => commentApi.getPostComments(postId, sort),
    enabled: !!postId,
  });
};

export const useCreateComment = (postId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { content: string; parentId?: string }) =>
      commentApi.create(postId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      toast.success('Comment posted!');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to post comment';
      toast.error(errorMessage);
    },
  });
};

export const useUpdateComment = (commentId: string, postId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { content: string }) => commentApi.update(commentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId, 'comments'] });
      toast.success('Comment updated!');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to update comment';
      toast.error(errorMessage);
    },
  });
};

export const useDeleteComment = (postId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => commentApi.delete(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      toast.success('Comment deleted');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to delete comment';
      toast.error(errorMessage);
    },
  });
};

export const useUpvoteComment = (postId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => voteApi.upvote(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId, 'comments'] });
      toast.success('Upvoted!');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to upvote';
      toast.error(errorMessage);
    },
  });
};

export const useDownvoteComment = (postId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => voteApi.downvote(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId, 'comments'] });
      toast.success('Downvoted!');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to downvote';
      toast.error(errorMessage);
    },
  });
};
