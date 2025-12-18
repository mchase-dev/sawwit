import React, { useState } from 'react';
import { Card, Typography, List, Space, Tag, Select } from 'antd';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppLayout, LoadingSpinner, ErrorMessage, EmptyState, Avatar } from '../../components';
import { formatDateTime } from '../../utils';
import { modLogApi } from '../../services/api/modlog.api';

const { Title, Text } = Typography;

interface ModLogEntry {
  id: string;
  action: string;
  moderator: {
    username: string;
    avatar?: string;
  };
  targetType: 'post' | 'comment' | 'user';
  targetInfo: string;
  reason?: string;
  createdAt: string;
}

export const ModLogPage: React.FC = () => {
  const { topicName } = useParams<{ topicName?: string }>();
  const [filterAction, setFilterAction] = useState<string>('all');
  const queryClient = useQueryClient();

  // Fetch modlog entries
  const { data, isLoading: loading, error } = useQuery({
    queryKey: ['modlog', topicName || 'all'],
    queryFn: () =>
      topicName ? modLogApi.getTopicLogs(topicName) : modLogApi.getLogs(),
  });

  const entries = data?.data || [];
  const filteredEntries =
    filterAction === 'all'
      ? entries
      : entries.filter((e: any) => e.action === filterAction);

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      remove_post: 'Removed Post',
      remove_comment: 'Removed Comment',
      ban_user: 'Banned User',
      unban_user: 'Unbanned User',
      pin_post: 'Pinned Post',
      unpin_post: 'Unpinned Post',
      lock_post: 'Locked Post',
      unlock_post: 'Unlocked Post',
      appoint_moderator: 'Appointed Moderator',
      remove_moderator: 'Removed Moderator',
    };
    return labels[action] || action;
  };

  const getActionColor = (action: string) => {
    if (action.includes('remove') || action.includes('ban') || action.includes('lock')) {
      return 'red';
    }
    if (action.includes('unban') || action.includes('unlock') || action.includes('appoint')) {
      return 'green';
    }
    if (action.includes('pin')) {
      return 'blue';
    }
    return 'default';
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
          message="Failed to load moderation log"
          description={(error as any)?.response?.data?.error || (error as Error)?.message || 'An error occurred'}
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['modlog'] })}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Title level={2}>
        {topicName ? `Moderation Log - t/${topicName}` : 'Global Moderation Log'}
      </Title>

      <Card style={{ marginBottom: '16px' }}>
        <Space wrap>
          <span>Filter by action:</span>
          <Select
            value={filterAction}
            onChange={setFilterAction}
            style={{ width: 180 }}
            options={[
              { label: 'All Actions', value: 'all' },
              { label: 'Removed Posts', value: 'remove_post' },
              { label: 'Removed Comments', value: 'remove_comment' },
              { label: 'Banned Users', value: 'ban_user' },
              { label: 'Unbanned Users', value: 'unban_user' },
              { label: 'Pinned Posts', value: 'pin_post' },
              { label: 'Locked Posts', value: 'lock_post' },
            ]}
          />
        </Space>
      </Card>

      <Card>
        {filteredEntries.length === 0 ? (
          <EmptyState description="No moderation actions found" />
        ) : (
          <List
            dataSource={filteredEntries}
            renderItem={(entry: ModLogEntry) => (
              <List.Item>
                <List.Item.Meta
                  avatar={
                    <Avatar
                      username={entry.moderator.username}
                      src={entry.moderator.avatar}
                    />
                  }
                  title={
                    <Space>
                      <Tag color={getActionColor(entry.action)}>
                        {getActionLabel(entry.action)}
                      </Tag>
                      <Link to={`/u/${entry.moderator.username}`}>
                        <Text strong>u/{entry.moderator.username}</Text>
                      </Link>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={4}>
                      <Text>{entry.targetInfo}</Text>
                      {entry.reason && (
                        <Text type="secondary">Reason: {entry.reason}</Text>
                      )}
                      <Text type="secondary">{formatDateTime(entry.createdAt)}</Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </AppLayout>
  );
};
