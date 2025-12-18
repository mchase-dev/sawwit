import React, { useState } from 'react';
import { Typography, Button, Space, Tabs, Switch, Spin } from 'antd';
import { Link } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout, PostCard, LoadingSpinner, ErrorMessage, EmptyState } from '../components';
import { PlusOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts';
import { useInfiniteScroll } from '../hooks';
import { feedApi } from '../services/api/feed.api';
import { voteApi } from '../services/api/vote.api';
import { postApi } from '../services/api/post.api';
import { toast } from 'sonner';

const { Title, Text } = Typography;

export const AllFeedPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [sortBy, setSortBy] = useState<'hot' | 'new' | 'top'>('hot');
  const [includeNSFW, setIncludeNSFW] = useState(false);

  // Fetch all feed with infinite scroll
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['feed', 'all', 'infinite', sortBy, includeNSFW],
    queryFn: ({ pageParam = 1 }) => feedApi.getAllFeed(pageParam, 20, includeNSFW),
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination?.hasNextPage) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });

  // Flatten pages into a single array of posts
  const posts = data?.pages.flatMap((page) => page.data) || [];

  // Infinite scroll hook
  const { loadMoreRef } = useInfiniteScroll({
    onLoadMore: fetchNextPage,
    hasNextPage: !!hasNextPage,
    isLoading: isFetchingNextPage,
  });

  // Upvote mutation
  const upvoteMutation = useMutation({
    mutationFn: (postId: string) => voteApi.upvote(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed', 'all'] });
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
      queryClient.invalidateQueries({ queryKey: ['feed', 'all'] });
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
      queryClient.invalidateQueries({ queryKey: ['feed', 'all'] });
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
      queryClient.invalidateQueries({ queryKey: ['feed', 'all'] });
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
          message="Failed to load feed"
          description={(error as any)?.response?.data?.error || (error as Error)?.message || 'An error occurred'}
          onRetry={refetch}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>
          All Posts
        </Title>

        {isAuthenticated && (
          <Link to="/topics">
            <Button type="primary" icon={<PlusOutlined />}>
              Create Post
            </Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <div style={{ marginBottom: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Tabs
            activeKey={sortBy}
            onChange={(key) => setSortBy(key as any)}
            items={[
              { key: 'hot', label: 'Hot' },
              { key: 'new', label: 'New' },
              { key: 'top', label: 'Top' },
            ]}
          />

          <Space>
            <Switch checked={includeNSFW} onChange={setIncludeNSFW} />
            <Text>Include NSFW content</Text>
          </Space>
        </Space>
      </div>

      {/* Posts List */}
      {posts.length === 0 ? (
        <EmptyState description="No posts available" />
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

          {/* Infinite scroll trigger */}
          <div ref={loadMoreRef} style={{ height: '20px', margin: '20px 0' }}>
            {isFetchingNextPage && (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <Spin />
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
};
