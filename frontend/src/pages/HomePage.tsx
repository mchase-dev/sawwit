import React, { useState } from 'react';
import { Typography, Button, Spin } from 'antd';
import { Link } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout, PostCard, LoadingSpinner, ErrorMessage, EmptyState } from '../components';
import { CreateTopicModal } from './topics/CreateTopicModal';
import { PlusOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts';
import { useInfiniteScroll } from '../hooks';
import { feedApi } from '../services/api/feed.api';
import { voteApi } from '../services/api/vote.api';
import { postApi } from '../services/api/post.api';
import { topicApi } from '../services/api/topic.api';
import { toast } from 'sonner';

const { Title } = Typography;

export const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [createTopicModalVisible, setCreateTopicModalVisible] = useState(false);

  // Fetch home feed with infinite scroll
  const {
    data: homeData,
    isLoading: homeLoading,
    error: homeError,
    fetchNextPage: fetchNextHomePage,
    hasNextPage: hasNextHomePage,
    isFetchingNextPage: isFetchingNextHomePage,
    refetch: refetchHome,
  } = useInfiniteQuery({
    queryKey: ['feed', 'home', 'infinite'],
    queryFn: ({ pageParam = 1 }) => feedApi.getHomeFeed(pageParam, 20),
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination?.hasNextPage) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: isAuthenticated,
  });

  // Fetch all feed for non-authenticated users with infinite scroll
  const {
    data: allData,
    isLoading: allLoading,
    error: allError,
    fetchNextPage: fetchNextAllPage,
    hasNextPage: hasNextAllPage,
    isFetchingNextPage: isFetchingNextAllPage,
    refetch: refetchAll,
  } = useInfiniteQuery({
    queryKey: ['feed', 'all', 'infinite'],
    queryFn: ({ pageParam = 1 }) => feedApi.getAllFeed(pageParam, 20),
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination?.hasNextPage) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: !isAuthenticated,
  });

  // Use the appropriate data based on auth status
  const data = isAuthenticated ? homeData : allData;
  const loading = isAuthenticated ? homeLoading : allLoading;
  const feedError = isAuthenticated ? homeError : allError;
  const fetchNextPage = isAuthenticated ? fetchNextHomePage : fetchNextAllPage;
  const hasNextPage = isAuthenticated ? hasNextHomePage : hasNextAllPage;
  const isFetchingNextPage = isAuthenticated ? isFetchingNextHomePage : isFetchingNextAllPage;

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
      queryClient.invalidateQueries({ queryKey: ['feed'] });
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
      queryClient.invalidateQueries({ queryKey: ['feed'] });
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
      queryClient.invalidateQueries({ queryKey: ['feed'] });
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
      queryClient.invalidateQueries({ queryKey: ['feed'] });
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

  // Create topic mutation
  const createTopicMutation = useMutation({
    mutationFn: (data: any) => topicApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      setCreateTopicModalVisible(false);
      toast.success('Topic created successfully!');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to create topic';
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

  const handleCreateTopic = async (data: { displayName: string; description: string; rules?: string }) => {
    if (!isAuthenticated) {
      toast.error('Please log in to create topics');
      return;
    }
    await createTopicMutation.mutateAsync(data);
  };

  if (loading) {
    return (
      <AppLayout>
        <LoadingSpinner />
      </AppLayout>
    );
  }

  if (feedError) {
    return (
      <AppLayout>
        <ErrorMessage
          message="Failed to load posts"
          description={(feedError as any)?.response?.data?.error || (feedError as Error)?.message || 'An error occurred'}
          onRetry={() => isAuthenticated ? refetchHome() : refetchAll()}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>
          {isAuthenticated ? 'Home Feed' : 'Popular Posts'}
        </Title>

        {isAuthenticated && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateTopicModalVisible(true)}>
            Create Topic
          </Button>
        )}
      </div>

      {posts.length === 0 ? (
        <EmptyState
          description={
            isAuthenticated
              ? 'No posts yet. Join some topics to see posts in your feed!'
              : 'No posts available.'
          }
        >
          {isAuthenticated && (
            <Link to="/topics">
              <Button type="primary">Browse Topics</Button>
            </Link>
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

      <CreateTopicModal
        visible={createTopicModalVisible}
        onClose={() => setCreateTopicModalVisible(false)}
        onSubmit={handleCreateTopic}
      />
    </AppLayout>
  );
};
