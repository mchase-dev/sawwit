import React, { useState } from 'react';
import { Typography, Button, Input, Space, Select } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout, LoadingSpinner, ErrorMessage, EmptyState } from '../../components';
import { TopicCard } from '../../components/Topic';
import { useAuth } from '../../contexts';
import { CreateTopicModal } from './CreateTopicModal';
import { topicApi } from '../../services/api/topic.api';
import { toast } from 'sonner';

const { Title } = Typography;

export const TopicsListPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'popular' | 'new' | 'active'>('popular');
  const [createModalVisible, setCreateModalVisible] = useState(false);

  // Fetch topics
  const { data, isLoading, error } = useQuery({
    queryKey: ['topics', sortBy],
    queryFn: () => topicApi.getAll(1, 50, sortBy),
  });

  // Join topic mutation
  const joinMutation = useMutation({
    mutationFn: (topicName: string) => topicApi.join(topicName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] });
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

  // Leave topic mutation
  const leaveMutation = useMutation({
    mutationFn: (topicName: string) => topicApi.leave(topicName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] });
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

  // Create topic mutation
  const createTopicMutation = useMutation({
    mutationFn: (data: any) => topicApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      setCreateModalVisible(false);
      toast.success('Topic created successfully!');
    },
    // Error handling is done in CreateTopicModal
  });

  const topics = data?.data || [];

  const handleJoin = (topicName: string) => {
    if (!isAuthenticated) {
      toast.error('Please log in to join topics');
      return;
    }
    joinMutation.mutate(topicName);
  };

  const handleLeave = (topicName: string) => {
    leaveMutation.mutate(topicName);
  };

  const handleCreateTopic = async (data: { displayName: string; description: string; rules?: string }) => {
    if (!isAuthenticated) {
      toast.error('Please log in to create topics');
      return;
    }
    await createTopicMutation.mutateAsync(data);
  };

  const filteredTopics = topics.filter((topic: any) =>
    topic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    topic.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    topic.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
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
          message="Failed to load topics"
          description={(error as any)?.response?.data?.error || (error as Error)?.message || 'An error occurred'}
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['topics'] })}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>
          Topics
        </Title>

        {isAuthenticated && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            Create Topic
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <Space direction="vertical" size={16} style={{ width: '100%', marginBottom: '24px' }}>
        <Input
          placeholder="Search topics..."
          prefix={<SearchOutlined />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          allowClear
          size="large"
          autoComplete="off"
        />

        <Space>
          <span>Sort by:</span>
          <Select
            value={sortBy}
            onChange={setSortBy}
            style={{ width: 120 }}
            options={[
              { label: 'Popular', value: 'popular' },
              { label: 'New', value: 'new' },
              { label: 'Active', value: 'active' },
            ]}
          />
        </Space>
      </Space>

      {/* Topics List */}
      {filteredTopics.length === 0 ? (
        <EmptyState description={searchQuery ? 'No topics found matching your search' : 'No topics available'}>
          {isAuthenticated && !searchQuery && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>
              Create the First Topic
            </Button>
          )}
        </EmptyState>
      ) : (
        <div>
          {filteredTopics.map((topic: any) => (
            <TopicCard
              key={topic.name}
              topic={topic}
              onJoin={() => handleJoin(topic.name)}
              onLeave={() => handleLeave(topic.name)}
              showActions={isAuthenticated}
            />
          ))}
        </div>
      )}

      <CreateTopicModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSubmit={handleCreateTopic}
      />
    </AppLayout>
  );
};
