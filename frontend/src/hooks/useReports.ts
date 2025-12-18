import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportApi } from '../services/api/report.api';
import { toast } from 'sonner';

export const useReports = (topicId?: string, status?: 'PENDING' | 'RESOLVED' | 'DISMISSED') => {
  return useQuery({
    queryKey: ['reports', topicId, status],
    queryFn: () => reportApi.getAll(topicId, status),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useCreateReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      targetType: 'POST' | 'COMMENT' | 'USER';
      targetId: string;
      reason: string;
      details?: string;
    }) => reportApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Report submitted');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to submit report';
      toast.error(errorMessage);
    },
  });
};

export const useResolveReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reportId: string) => reportApi.resolve(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Report resolved');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to resolve report';
      toast.error(errorMessage);
    },
  });
};

export const useDismissReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reportId: string) => reportApi.dismiss(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Report dismissed');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to dismiss report';
      toast.error(errorMessage);
    },
  });
};
