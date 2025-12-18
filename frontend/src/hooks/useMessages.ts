import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messageApi } from '../services/api/message.api';
import { useAuth } from '../contexts';
import { toast } from 'sonner';

export const useConversations = () => {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => messageApi.getConversations(),
    staleTime: 1 * 60 * 1000, // 1 minute
    enabled: isAuthenticated,
  });
};

export const useConversation = (otherUserId: string) => {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['conversation', otherUserId],
    queryFn: () => messageApi.getConversation(otherUserId),
    enabled: isAuthenticated && !!otherUserId,
  });
};

export const useUnreadCount = () => {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['messages', 'unread'],
    queryFn: () => messageApi.getUnreadCount(),
    staleTime: 30 * 1000, // 30 seconds
    enabled: isAuthenticated,
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { recipientId: string; content: string; parentId?: string }) =>
      messageApi.send(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation', variables.recipientId] });
      toast.success('Message sent!');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to send message';
      toast.error(errorMessage);
    },
  });
};

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageId: string) => messageApi.markAsRead(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages', 'unread'] });
    },
  });
};
