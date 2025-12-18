import React, { useState } from 'react';
import { Card, Typography, Button, Space, Tag, Tabs, Collapse } from 'antd';
import {
  UserOutlined,
  PlusOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout, LoadingSpinner, ErrorMessage, EmptyState, PostCard } from '../../components';
import { CreatePostModal } from '../posts/CreatePostModal';
import { useAuth } from '../../contexts';
import { formatCompactNumber } from '../../utils';
import { topicApi } from '../../services/api/topic.api';
import { voteApi } from '../../services/api/vote.api';
import { postApi } from '../../services/api/post.api';
import { toast } from 'sonner';

const { Title, Paragraph, Text } = Typography;

export const TopicPage: React.FC = () => {
  const { topicName } = useParams<{ topicName: string }>();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sortBy, setSortBy] = useState<'hot' | 'new' | 'top'>('hot');
  const [createPostModalVisible, setCreatePostModalVisible] = useState(false);

  // Fetch topic
  const { data: topic, isLoading, error } = useQuery({
    queryKey: ['topic', topicName],
    queryFn: () => topicApi.getByName(topicName!),
    enabled: !!topicName,
  });

  // Fetch posts
  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ['topic', topicName, 'posts', sortBy],
    queryFn: () => topicApi.getPosts(topicName!, 1, 20, sortBy),
    enabled: !!topicName,
  });

  // Join topic mutation
  const joinMutation = useMutation({
    mutationFn: () => topicApi.join(topicName!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topic', topicName] });
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
    mutationFn: () => topicApi.leave(topicName!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topic', topicName] });
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

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: (data: any) => topicApi.createPost(topicName!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topic', topicName, 'posts'] });
      queryClient.invalidateQueries({ queryKey: ['topic', topicName] });
      setCreatePostModalVisible(false);
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to create post';
      toast.error(errorMessage);
    },
  });

  // Upvote mutation
  const upvoteMutation = useMutation({
    mutationFn: (postId: string) => voteApi.upvote(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topic', topicName, 'posts'] });
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

  // Downvote mutation
  const downvoteMutation = useMutation({
    mutationFn: (postId: string) => voteApi.downvote(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topic', topicName, 'posts'] });
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

  // Save post mutation
  const saveMutation = useMutation({
    mutationFn: (postId: string) => postApi.save(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topic', topicName, 'posts'] });
      toast.success('Post saved!');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to save post';
      toast.error(errorMessage);
    },
  });

  // Unsave post mutation
  const unsaveMutation = useMutation({
    mutationFn: (postId: string) => postApi.unsave(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topic', topicName, 'posts'] });
      toast.success('Post unsaved!');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to unsave post';
      toast.error(errorMessage);
    },
  });

  const posts = postsData?.data || [];
  const isMember = topic?.isMember || false;
  const isOwner = topic?.ownerId === user?.id;
  const isModerator = topic?.memberRole === 'MODERATOR' || isOwner;

  const handleJoin = () => {
    if (!isAuthenticated) {
      toast.error('Please log in to join topics');
      return;
    }
    joinMutation.mutate();
  };

  const handleLeave = () => {
    leaveMutation.mutate();
  };

  const handleCreatePost = () => {
    if (!isAuthenticated) {
      toast.error('Please log in to create posts');
      return;
    }
    if (!isMember) {
      toast.error('Please join the topic first');
      return;
    }
    setCreatePostModalVisible(true);
  };

  const handleSubmitPost = async (data: any) => {
    await createPostMutation.mutateAsync(data);
  };

  const handleUpvote = (postId: string) => {
    if (!isAuthenticated) {
      toast.error('Please log in to vote');
      return;
    }
    upvoteMutation.mutate(postId);
  };

  const handleDownvote = (postId: string) => {
    if (!isAuthenticated) {
      toast.error('Please log in to vote');
      return;
    }
    downvoteMutation.mutate(postId);
  };

  const handleSave = (postId: string, isSaved?: boolean) => {
    if (!isAuthenticated) {
      toast.error('Please log in to save posts');
      return;
    }
    if (isSaved) {
      unsaveMutation.mutate(postId);
    } else {
      saveMutation.mutate(postId);
    }
  };

  // Reserved for future dropdown menu
  // const _topicMenuItems: MenuProps['items'] = [
  //   ...(isModerator
  //     ? [
  //         {
  //           key: 'settings',
  //           icon: <SettingOutlined />,
  //           label: 'Topic Settings',
  //           onClick: () => navigate(`/t/${topicName}/moderate`),
  //         },
  //       ]
  //     : []),
  // ];

  if (isLoading) {
    return (
      <AppLayout>
        <LoadingSpinner />
      </AppLayout>
    );
  }

  if (error || !topic) {
    return (
      <AppLayout>
        <ErrorMessage
          message="Failed to load topic"
          description={(error as any)?.response?.data?.error || (error as Error)?.message || 'Topic not found'}
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['topic', topicName] })}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Topic Header */}
      <Card style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          {/* Left: Moderate Button */}
          {isModerator && (
            <div>
              <Button
                icon={<SettingOutlined />}
                onClick={() => navigate(`/t/${topicName}/moderate`)}
              >
                Moderate
              </Button>
            </div>
          )}

          {/* Center: Topic Info */}
          <div style={{ flex: 1 }}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Space>
                <Title level={2} style={{ margin: 0 }}>
                  t/{topic.name}
                </Title>
                {topic.isNSFW && <Tag color="error">NSFW</Tag>}
              </Space>

              <Paragraph style={{ margin: 0, fontSize: '16px' }}>
                {topic.description}
              </Paragraph>

              <Space size={16}>
                <Space size={4}>
                  <UserOutlined />
                  <Text strong>{formatCompactNumber(topic._count?.members || 0)}</Text>
                  <Text type="secondary">members</Text>
                </Space>
                <Text type="secondary">•</Text>
                <Text type="secondary">{formatCompactNumber(topic._count?.posts || 0)} posts</Text>
              </Space>
            </Space>
          </div>

          {/* Right: Join/Leave Button */}
          {isAuthenticated && (
            <div>
              {isMember ? (
                <Space direction="vertical" size={4} align="center">
                  <Text type="secondary" style={{ fontSize: '12px' }}>Joined</Text>
                  <Button
                    danger
                    onClick={handleLeave}
                    loading={leaveMutation.isPending}
                  >
                    Leave
                  </Button>
                </Space>
              ) : (
                <Button
                  type="primary"
                  onClick={handleJoin}
                  loading={joinMutation.isPending}
                >
                  Join
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Rules Section */}
      {topic.rules && (
        <Collapse
          style={{ marginBottom: '16px' }}
          items={[
            {
              key: 'rules',
              label: <Text strong>Rules</Text>,
              children: (
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  <Text>{topic.rules}</Text>
                </div>
              ),
            },
          ]}
        />
      )}

      {/* Create Post Button */}
      {isAuthenticated && isMember && (
        <Card style={{ marginBottom: '16px' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreatePost}
            block
            size="large"
          >
            Create Post
          </Button>
        </Card>
      )}

      {/* Sort Tabs */}
      <Tabs
        activeKey={sortBy}
        onChange={(key) => setSortBy(key as any)}
        items={[
          { key: 'hot', label: 'Hot' },
          { key: 'new', label: 'New' },
          { key: 'top', label: 'Top' },
        ]}
        style={{ marginBottom: '16px' }}
      />

      {/* Posts List */}
      {postsLoading ? (
        <LoadingSpinner />
      ) : posts.length === 0 ? (
        <EmptyState description="No posts yet">
          {isAuthenticated && isMember && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreatePost}>
              Create the First Post
            </Button>
          )}
        </EmptyState>
      ) : (
        <div>
          {posts.map((post: any) => (
            <PostCard
              key={post.id}
              post={post}
              onUpvote={() => handleUpvote(post.id)}
              onDownvote={() => handleDownvote(post.id)}
              onSave={isAuthenticated ? () => handleSave(post.id, post.isSaved) : undefined}
            />
          ))}
        </div>
      )}

      {/* Create Post Modal */}
      <CreatePostModal
        visible={createPostModalVisible}
        onClose={() => setCreatePostModalVisible(false)}
        onSubmit={handleSubmitPost}
        topicName={topicName || ''}
        topicId={topic.id}
      />
    </AppLayout>
  );
};
