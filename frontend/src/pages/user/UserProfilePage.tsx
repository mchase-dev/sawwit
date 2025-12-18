import React, { useState } from 'react';
import { Card, Typography, Space, Tabs, Button, Dropdown, Alert } from 'antd';
import { SettingOutlined, StopOutlined, MoreOutlined, CheckOutlined, MessageOutlined } from '@ant-design/icons';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AppLayout,
  LoadingSpinner,
  ErrorMessage,
  Avatar,
  PostCard,
  EmptyState,
  showConfirmModal,
} from '../../components';
import { useAuth } from '../../contexts';
import { formatDate, formatCompactNumber, processHtmlContentWithRefs } from '../../utils';
import { userApi } from '../../services/api/user.api';
import { voteApi } from '../../services/api/vote.api';
import { postApi } from '../../services/api/post.api';
import { blockApi } from '../../services/api/block.api';
import { badgeApi } from '../../services/api/badge.api';
import type { MenuProps } from 'antd';
import { toast } from 'sonner';

const { Title, Text, Paragraph } = Typography;

export const UserProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'posts' | 'comments' | 'saved'>('posts');

  // Fetch user profile
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user', username],
    queryFn: () => userApi.getByUsername(username!),
    enabled: !!username,
  });

  // Fetch user posts
  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ['user', username, 'posts'],
    queryFn: () => userApi.getUserPosts(username!),
    enabled: !!username && activeTab === 'posts',
  });

  // Fetch user comments
  const { data: commentsData, isLoading: commentsLoading } = useQuery({
    queryKey: ['user', username, 'comments'],
    queryFn: () => userApi.getUserComments(username!),
    enabled: !!username && activeTab === 'comments',
  });

  // Fetch saved posts (only for own profile)
  const isOwnProfile = currentUser?.username === username;
  const { data: savedData, isLoading: savedLoading } = useQuery({
    queryKey: ['user', 'saved'],
    queryFn: () => userApi.getSavedPosts(),
    enabled: isOwnProfile && activeTab === 'saved',
  });

  // Check if user is blocked (only for other users' profiles)
  const { data: isBlocked, isLoading: _blockStatusLoading } = useQuery({
    queryKey: ['block', user?.id],
    queryFn: () => blockApi.isBlocked(user!.id),
    enabled: !!user?.id && !!currentUser && !isOwnProfile,
  });

  // Fetch user badges
  const { data: userBadges } = useQuery({
    queryKey: ['badges', 'user', user?.id],
    queryFn: () => badgeApi.getUserBadges(user!.id),
    enabled: !!user?.id,
  });

  // Block user mutation
  const blockMutation = useMutation({
    mutationFn: () => blockApi.block(user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['block', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['blocks'] });
      toast.success(`Blocked u/${username}`);
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to block user';
      toast.error(errorMessage);
    },
  });

  // Unblock user mutation
  const unblockMutation = useMutation({
    mutationFn: () => blockApi.unblock(user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['block', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['blocks'] });
      toast.success(`Unblocked u/${username}`);
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to unblock user';
      toast.error(errorMessage);
    },
  });

  // Upvote mutation
  const upvoteMutation = useMutation({
    mutationFn: (postId: string) => voteApi.upvote(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', username] });
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
      queryClient.invalidateQueries({ queryKey: ['user', username] });
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
      queryClient.invalidateQueries({ queryKey: ['user'] });
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
      queryClient.invalidateQueries({ queryKey: ['user'] });
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
    if (!currentUser) {
      toast.error('Please log in to vote');
      return;
    }
    upvoteMutation.mutate(postId);
  };

  const handleDownvote = (postId: string) => {
    if (!currentUser) {
      toast.error('Please log in to vote');
      return;
    }
    downvoteMutation.mutate(postId);
  };

  const handleSave = (postId: string, isSaved?: boolean) => {
    if (!currentUser) {
      toast.error('Please log in to save posts');
      return;
    }
    if (isSaved) {
      unsaveMutation.mutate(postId);
    } else {
      saveMutation.mutate(postId);
    }
  };

  const handleBlock = () => {
    showConfirmModal({
      title: 'Block User',
      content: `Are you sure you want to block u/${username}? You won't see their posts, comments, or receive messages from them.`,
      okText: 'Block',
      okType: 'danger',
      onConfirm: async () => {
        blockMutation.mutate();
      },
    });
  };

  const handleUnblock = () => {
    unblockMutation.mutate();
  };

  // Profile action menu items for other users
  const profileMenuItems: MenuProps['items'] = !isOwnProfile && currentUser ? [
    {
      key: 'message',
      icon: <MessageOutlined />,
      label: 'Send Message',
      onClick: () => navigate(`/messages/${username}`),
    },
    { type: 'divider' },
    isBlocked
      ? {
          key: 'unblock',
          icon: <CheckOutlined />,
          label: 'Unblock User',
          onClick: handleUnblock,
        }
      : {
          key: 'block',
          icon: <StopOutlined />,
          label: 'Block User',
          danger: true,
          onClick: handleBlock,
        },
  ] : [];

  if (isLoading) {
    return (
      <AppLayout>
        <LoadingSpinner />
      </AppLayout>
    );
  }

  if (error || !user) {
    return (
      <AppLayout>
        <ErrorMessage
          message="Failed to load user profile"
          description={(error as any)?.response?.data?.error || (error as Error)?.message || 'User not found'}
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['user', username] })}
        />
      </AppLayout>
    );
  }

  const posts = postsData?.data || [];
  const comments = commentsData?.data || [];
  const savedPosts = savedData?.data || [];

  return (
    <AppLayout>
      {/* Blocked User Notice */}
      {isBlocked && (
        <Alert
          message="You have blocked this user"
          description="You won't see their posts or comments in your feeds, and they cannot send you messages."
          type="warning"
          showIcon
          icon={<StopOutlined />}
          style={{ marginBottom: '16px' }}
          action={
            <Button
              size="small"
              onClick={handleUnblock}
              loading={unblockMutation.isPending}
            >
              Unblock
            </Button>
          }
        />
      )}

      {/* Profile Header */}
      <Card style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
          <Avatar username={user.username} avatarStyle={user.avatarStyle} avatarSeed={user.avatarSeed} size={100} />

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <Title level={2} style={{ margin: 0 }}>
                  {user.displayName || user.username}
                </Title>
                <Text type="secondary">u/{user.username}</Text>
              </div>

              <Space>
                {isOwnProfile && (
                  <Link to="/settings">
                    <Button icon={<SettingOutlined />}>
                      Edit Profile
                    </Button>
                  </Link>
                )}
                {!isOwnProfile && currentUser && profileMenuItems.length > 0 && (
                  <Dropdown menu={{ items: profileMenuItems }} trigger={['click']}>
                    <Button icon={<MoreOutlined />} />
                  </Dropdown>
                )}
              </Space>
            </div>

            {user.bio && (
              <Paragraph style={{ marginTop: '12px', marginBottom: '12px' }}>
                {user.bio}
              </Paragraph>
            )}

            <Space size={24} style={{ marginTop: '12px' }}>
              <div>
                <Text strong style={{ fontSize: '20px', color: '#52c41a' }}>
                  {formatCompactNumber(user.postCred || 0)}
                </Text>
                <br />
                <Text type="secondary">Post Cred</Text>
              </div>
              <div>
                <Text strong style={{ fontSize: '20px', color: '#1890ff' }}>
                  {formatCompactNumber(user.commentCred || 0)}
                </Text>
                <br />
                <Text type="secondary">Comment Cred</Text>
              </div>
              <div>
                <Text type="secondary">
                  Member since {formatDate(user.createdAt)}
                </Text>
              </div>
            </Space>

            {/* User Badges */}
            {userBadges && userBadges.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <Text strong>Badges:</Text>
                <Space size={8} wrap style={{ marginTop: '8px', display: 'flex' }}>
                  {userBadges.map((badge: any) => (
                    <div
                      key={badge.id}
                      style={{
                        padding: '4px 12px',
                        backgroundColor: badge.bgColor || '#f0f0f0',
                        color: badge.textColor || '#000000',
                        borderRadius: '16px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        fontWeight: 500,
                      }}
                      title={`Awarded in t/${badge.topic?.name || 'unknown'}`}
                    >
                      <Text style={{ color: badge.textColor || '#000000' }}>{badge.text}</Text>
                    </div>
                  ))}
                </Space>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Content Tabs */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as any)}
          items={[
            {
              key: 'posts',
              label: 'Posts',
              children: (
                <div>
                  {postsLoading ? (
                    <LoadingSpinner />
                  ) : posts.length === 0 ? (
                    <EmptyState description="No posts yet" />
                  ) : (
                    posts.map((post: any) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        onUpvote={() => handleUpvote(post.id)}
                        onDownvote={() => handleDownvote(post.id)}
                        onSave={currentUser ? () => handleSave(post.id, post.isSaved) : undefined}
                        compact
                      />
                    ))
                  )}
                </div>
              ),
            },
            {
              key: 'comments',
              label: 'Comments',
              children: (
                <div>
                  {commentsLoading ? (
                    <LoadingSpinner />
                  ) : comments.length === 0 ? (
                    <EmptyState description="No comments yet" />
                  ) : (
                    <div>
                      {comments.map((comment: any) => (
                        <Card key={comment.id} style={{ marginBottom: '12px' }} size="small">
                          <Space direction="vertical" style={{ width: '100%' }}>
                            <div>
                              <Link to={`/t/${comment.post?.topic?.name}/post/${comment.post?.slug}`}>
                                <Text strong>{comment.post?.title}</Text>
                              </Link>
                              <Text type="secondary"> in </Text>
                              <Link to={`/t/${comment.post?.topic?.name}`}>
                                <Text>t/{comment.post?.topic?.name}</Text>
                              </Link>
                            </div>
                            <div dangerouslySetInnerHTML={{ __html: processHtmlContentWithRefs(comment.content) }} />
                            <Space>
                              <Text type="secondary">{comment.voteCount || 0} points</Text>
                              <Text type="secondary">•</Text>
                              <Text type="secondary">{formatDate(comment.createdAt)}</Text>
                            </Space>
                          </Space>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              ),
            },
            ...(isOwnProfile
              ? [
                  {
                    key: 'saved',
                    label: 'Saved',
                    children: (
                      <div>
                        {savedLoading ? (
                          <LoadingSpinner />
                        ) : savedPosts.length === 0 ? (
                          <EmptyState description="No saved posts" />
                        ) : (
                          savedPosts.map((post: any) => (
                            <PostCard
                              key={post.id}
                              post={post}
                              onUpvote={() => handleUpvote(post.id)}
                              onDownvote={() => handleDownvote(post.id)}
                              onSave={() => handleSave(post.id, true)}
                              compact
                            />
                          ))
                        )}
                      </div>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </Card>
    </AppLayout>
  );
};
