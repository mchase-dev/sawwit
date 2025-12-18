import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../services/api/user.api';
import { toast } from 'sonner';

export const useUserProfile = (username: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['user', username],
    queryFn: () => userApi.getProfile(username),
    enabled: !!username && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useUserPosts = (username: string, page: number = 1, limit: number = 20) => {
  return useQuery({
    queryKey: ['user', username, 'posts', page],
    queryFn: () => userApi.getUserPosts(username, page, limit),
    enabled: !!username,
  });
};

export const useUserComments = (username: string, page: number = 1, limit: number = 20) => {
  return useQuery({
    queryKey: ['user', username, 'comments', page],
    queryFn: () => userApi.getUserComments(username, page, limit),
    enabled: !!username,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { bio?: string; location?: string }) => userApi.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast.success('Profile updated successfully!');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to update profile';
      toast.error(errorMessage);
    },
  });
};

export const useUpdatePassword = () => {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      userApi.updatePassword(data),
    onSuccess: () => {
      toast.success('Password updated successfully!');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to update password';
      toast.error(errorMessage);
    },
  });
};

export const useDeleteAccount = () => {
  return useMutation({
    mutationFn: (data: { password: string; confirmation: string }) =>
      userApi.deleteAccount({ password: data.password, confirmText: data.confirmation }),
    onSuccess: () => {
      toast.success('Account deleted successfully');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to delete account';
      toast.error(errorMessage);
    },
  });
};

export const useUploadAvatar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => userApi.uploadAvatar(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast.success('Avatar updated successfully!');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to upload avatar';
      toast.error(errorMessage);
    },
  });
};
