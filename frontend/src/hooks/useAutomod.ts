import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { automodApi } from '../services/api/automod.api';
import { toast } from 'sonner';

export const useAutomodRules = (topicId: string) => {
  return useQuery({
    queryKey: ['automod', topicId],
    queryFn: () => automodApi.getRules(topicId),
    enabled: !!topicId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateAutomodRule = (topicId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      conditions: { type: string; value: any }[];
      actions: { type: string; value: any }[];
      priority?: number;
      enabled?: boolean;
    }) => automodApi.createRule(topicId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automod', topicId] });
      toast.success('Rule created!');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to create rule';
      toast.error(errorMessage);
    },
  });
};

export const useUpdateAutomodRule = (topicId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ruleId, data }: {
      ruleId: string;
      data: {
        name?: string;
        conditions?: any;
        action?: 'REMOVE' | 'FLAG' | 'REPORT';
        priority?: number;
        enabled?: boolean;
      };
    }) => automodApi.updateRule(ruleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automod', topicId] });
      toast.success('Rule updated!');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to update rule';
      toast.error(errorMessage);
    },
  });
};

export const useDeleteAutomodRule = (topicId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ruleId: string) => automodApi.deleteRule(ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automod', topicId] });
      toast.success('Rule deleted');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to delete rule';
      toast.error(errorMessage);
    },
  });
};

export const useTestAutomodRule = () => {
  return useMutation({
    mutationFn: (data: { ruleId: string; content: string }) =>
      automodApi.testRule(data.ruleId, data.content),
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to test rule';
      toast.error(errorMessage);
    },
  });
};
