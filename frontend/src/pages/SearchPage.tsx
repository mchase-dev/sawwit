import React, { useState, useEffect } from 'react';
import { Card, Typography, Input, Tabs, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout, LoadingSpinner, ErrorMessage, EmptyState, PostCard } from '../components';
import { TopicCard } from '../components/Topic';
import { Avatar } from '../components';
import { Link } from 'react-router-dom';
import { searchApi } from '../services/api/search.api';
import { voteApi } from '../services/api/vote.api';
import { postApi } from '../services/api/post.api';
import { topicApi } from '../services/api/topic.api';
import { useAuth } from '../contexts';
import { toast } from 'sonner';
import { formatCompactNumber } from '../utils';

const { Title, Text } = Typography;

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [activeTab, setActiveTab] = useState<'posts' | 'topics' | 'users'>('posts');
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    const query = searchParams.get('q');
    if (query) {
      setSearchQuery(query);
    }
  }, [searchParams]);

  const handleSearch = (value: string) => {
    if (value.trim()) {
      setSearchParams({ q: value.trim() });
      setSearchQuery(value.trim());
    }
  };

  // Fetch search results
  const { data, isLoading: loading, error } = useQuery({
    queryKey: ['search', searchQuery],
    queryFn: () => searchApi.global(searchQuery),
    enabled: searchQuery.length >= 2,
  });

  // Upvote mutation
  const upvoteMutation = useMutation({
    mutationFn: (postId: string) => voteApi.upvote(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search'] });
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
      queryClient.invalidateQueries({ queryKey: ['search'] });
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
      queryClient.invalidateQueries({ queryKey: ['search'] });
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
      queryClient.invalidateQueries({ queryKey: ['search'] });
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

  // Join topic mutation
  const joinMutation = useMutation({
    mutationFn: (topicName: string) => topicApi.join(topicName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search'] });
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
      queryClient.invalidateQueries({ queryKey: ['search'] });
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

  const results = data || { posts: [], topics: [], users: [] };

  return (
    <AppLayout>
      <Title level={2}>Search</Title>

      <Input.Search
        placeholder="Search topics, posts, users..."
        prefix={<SearchOutlined />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onSearch={handleSearch}
        size="large"
        style={{ marginBottom: '24px' }}
        allowClear
        autoComplete="off"
      />

      {error && (
        <ErrorMessage
          message="Search failed"
          description={(error as any)?.response?.data?.error || (error as Error)?.message || 'An error occurred'}
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['search'] })}
        />
      )}

      {loading && searchQuery && (
        <LoadingSpinner />
      )}

      {!loading && !error && searchQuery && searchQuery.length >= 2 && (
        <Card>
          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as any)}
            items={[
              {
                key: 'posts',
                label: `Posts (${results.posts?.length || 0})`,
                children: (
                  <div>
                    {!results.posts || results.posts.length === 0 ? (
                      <EmptyState description="No posts found" />
                    ) : (
                      results.posts.map((post: any) => (
                        <PostCard
                          key={post.id}
                          post={post}
                          onUpvote={() => handleUpvote(post.id)}
                          onDownvote={() => handleDownvote(post.id)}
                          onSave={isAuthenticated ? () => handleSave(post.id, post.isSaved) : undefined}
                        />
                      ))
                    )}
                  </div>
                ),
              },
              {
                key: 'topics',
                label: `Topics (${results.topics?.length || 0})`,
                children: (
                  <div>
                    {!results.topics || results.topics.length === 0 ? (
                      <EmptyState description="No topics found" />
                    ) : (
                      results.topics.map((topic: any) => (
                        <TopicCard
                          key={topic.name}
                          topic={topic}
                          onJoin={() => handleJoin(topic.name)}
                          onLeave={() => handleLeave(topic.name)}
                          showActions={isAuthenticated}
                        />
                      ))
                    )}
                  </div>
                ),
              },
              {
                key: 'users',
                label: `Users (${results.users?.length || 0})`,
                children: (
                  <div>
                    {!results.users || results.users.length === 0 ? (
                      <EmptyState description="No users found" />
                    ) : (
                      <div>
                        {results.users.map((user: any) => (
                          <Card key={user.username} style={{ marginBottom: '16px' }}>
                            <Link to={`/u/${user.username}`}>
                              <Space size={16}>
                                <Avatar
                                  username={user.username}
                                  size={64}
                                />
                                <div>
                                  <Text strong style={{ fontSize: '18px', display: 'block' }}>
                                    {user.displayName || user.username}
                                  </Text>
                                  <Text type="secondary">u/{user.username}</Text>
                                  <div style={{ marginTop: '8px' }}>
                                    <Space size={16}>
                                      <Text type="secondary">{formatCompactNumber(user.postCred || 0)} post cred</Text>
                                      <Text type="secondary">{formatCompactNumber(user.commentCred || 0)} comment cred</Text>
                                    </Space>
                                  </div>
                                </div>
                              </Space>
                            </Link>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </Card>
      )}

      {!searchQuery && (
        <EmptyState description="Enter a search query to find posts, topics, and users" />
      )}

      {searchQuery && searchQuery.length < 2 && (
        <EmptyState description="Search query must be at least 2 characters" />
      )}
    </AppLayout>
  );
};
