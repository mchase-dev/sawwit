import React from 'react';
import { Card, Typography, List, Button } from 'antd';
import { UserDeleteOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout, LoadingSpinner, ErrorMessage, EmptyState, Avatar, showConfirmModal } from '../../components';
import { formatRelativeTime } from '../../utils';
import { blockApi } from '../../services/api/block.api';
import { toast } from 'sonner';

const { Title, Text } = Typography;

interface BlockedUser {
  id: string;
  username: string;
  avatar?: string;
  blockedAt: string;
}

export const BlockedUsersPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Fetch blocked users
  const { data, isLoading: loading, error } = useQuery({
    queryKey: ['blocks'],
    queryFn: () => blockApi.getBlocked(),
  });

  // Unblock mutation
  const unblockMutation = useMutation({
    mutationFn: (userId: string) => blockApi.unblock(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocks'] });
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to unblock user';
      toast.error(errorMessage);
    },
  });

  const blockedUsers = data?.data || [];

  const handleUnblock = (userId: string, username: string) => {
    showConfirmModal({
      title: 'Unblock User',
      content: `Are you sure you want to unblock u/${username}?`,
      okText: 'Unblock',
      onConfirm: async () => {
        unblockMutation.mutate(userId);
        toast.success(`Unblocked u/${username}`);
      },
    });
  };

  if (loading) {
    return (
      <AppLayout showSidebar={false}>
        <LoadingSpinner />
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout showSidebar={false}>
        <ErrorMessage
          message="Failed to load blocked users"
          description={(error as any)?.response?.data?.error || (error as Error)?.message || 'An error occurred'}
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['blocks'] })}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout showSidebar={false}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <Title level={2}>Blocked Users</Title>

        <Card>
          {blockedUsers.length === 0 ? (
            <EmptyState
              description="You haven't blocked any users"
              image={<UserDeleteOutlined style={{ fontSize: '64px', color: '#d9d9d9' }} />}
            />
          ) : (
            <List
              dataSource={blockedUsers}
              renderItem={(user: BlockedUser) => (
                <List.Item
                  actions={[
                    <Button
                      type="default"
                      onClick={() => handleUnblock(user.id, user.username)}
                    >
                      Unblock
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar username={user.username} src={user.avatar} size="large" />}
                    title={
                      <Link to={`/u/${user.username}`}>
                        <Text strong>u/{user.username}</Text>
                      </Link>
                    }
                    description={`Blocked ${formatRelativeTime(user.blockedAt)}`}
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      </div>
    </AppLayout>
  );
};
