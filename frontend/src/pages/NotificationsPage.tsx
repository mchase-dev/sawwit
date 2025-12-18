import React, { useState } from 'react';
import { Card, Typography, List, Space, Button, Tag, Tabs } from 'antd';
import {
  BellOutlined,
  CommentOutlined,
  HeartOutlined,
  UserAddOutlined,
  DeleteOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout, LoadingSpinner, ErrorMessage, EmptyState, Avatar } from '../components';
import { formatRelativeTime } from '../utils';
import { notificationApi } from '../services/api/notification.api';
import { toast } from 'sonner';

const { Title, Text } = Typography;

interface Notification {
  id: string;
  type: 'COMMENT_REPLY' | 'POST_VOTE' | 'COMMENT_VOTE' | 'USER_MENTIONED';
  message: string;
  link: string;
  isRead: boolean;
  createdAt: string;
  actor?: {
    username: string;
    avatar?: string;
  };
}

export const NotificationsPage: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data, isLoading: loading, error } = useQuery({
    queryKey: ['notifications', filter],
    queryFn: () => notificationApi.getAll(1, 50, filter === 'unread' ? 'unread' : undefined),
  });

  // Fetch unread count
  const { data: unreadCountData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationApi.getUnreadCount(),
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Marked as read');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to mark as read';
      toast.error(errorMessage);
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to mark all as read';
      toast.error(errorMessage);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notification deleted');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to delete notification';
      toast.error(errorMessage);
    },
  });

  const notifications = data?.data || [];
  const unreadCount = unreadCountData || 0;
  const filteredNotifications = notifications;

  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate(id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'COMMENT_REPLY':
        return <CommentOutlined style={{ color: '#1890ff' }} />;
      case 'POST_VOTE':
      case 'COMMENT_VOTE':
        return <HeartOutlined style={{ color: '#ff4d4f' }} />;
      case 'USER_MENTIONED':
        return <UserAddOutlined style={{ color: '#52c41a' }} />;
      default:
        return <BellOutlined />;
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <LoadingSpinner />
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <ErrorMessage
          message="Failed to load notifications"
          description={(error as any)?.response?.data?.error || (error as Error)?.message || 'An error occurred'}
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['notifications'] })}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>
          Notifications {unreadCount > 0 && `(${unreadCount})`}
        </Title>

        {unreadCount > 0 && (
          <Button icon={<CheckOutlined />} onClick={handleMarkAllAsRead}>
            Mark All as Read
          </Button>
        )}
      </div>

      <Card>
        <Tabs
          activeKey={filter}
          onChange={(key) => setFilter(key as any)}
          items={[
            {
              key: 'all',
              label: `All (${notifications.length})`,
            },
            {
              key: 'unread',
              label: `Unread (${unreadCount})`,
            },
          ]}
        />

        {filteredNotifications.length === 0 ? (
          <EmptyState
            description={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          />
        ) : (
          <List
            dataSource={filteredNotifications}
            renderItem={(notification: Notification) => (
              <List.Item
                style={{
                  backgroundColor: notification.isRead ? 'transparent' : '#f0f5ff',
                  padding: '16px',
                  borderRadius: '4px',
                  marginBottom: '8px',
                }}
                actions={[
                  !notification.isRead && (
                    <Button
                      type="link"
                      size="small"
                      icon={<CheckOutlined />}
                      onClick={() => handleMarkAsRead(notification.id)}
                    >
                      Mark as Read
                    </Button>
                  ),
                  <Button
                    type="link"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDelete(notification.id)}
                  >
                    Delete
                  </Button>,
                ].filter(Boolean)}
              >
                <List.Item.Meta
                  avatar={
                    notification.actor ? (
                      <Avatar
                        username={notification.actor.username}
                        src={notification.actor.avatar}
                        size="large"
                      />
                    ) : (
                      getIcon(notification.type)
                    )
                  }
                  title={
                    <Space>
                      <Link to={notification.link}>
                        {notification.actor && (
                          <Text strong>u/{notification.actor.username} </Text>
                        )}
                        <Text>{notification.message}</Text>
                      </Link>
                      {!notification.isRead && <Tag color="blue">New</Tag>}
                    </Space>
                  }
                  description={formatRelativeTime(notification.createdAt)}
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </AppLayout>
  );
};
