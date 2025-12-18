import React, { useState } from 'react';
import { Card, Typography, Space, Tag, Button, Dropdown, Divider, Select, Tooltip, Modal, Form, Input, Checkbox } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  PushpinOutlined,
  LockOutlined,
  MoreOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AppLayout,
  LoadingSpinner,
  ErrorMessage,
  VoteButtons,
  Avatar,
  CommentForm,
  CommentTree,
  EmptyState,
  showConfirmModal,
  RichTextEditor,
} from '../../components';
import { useAuth } from '../../contexts';
import { formatRelativeTime, formatDateTime, processHtmlContentWithRefs } from '../../utils';
import { postApi } from '../../services/api/post.api';
import { voteApi } from '../../services/api/vote.api';
import { commentApi } from '../../services/api/comment.api';
import { tagApi } from '../../services/api/tag.api';
import type { MenuProps } from 'antd';
import { toast } from 'sonner';

const { Title, Text } = Typography;

export const PostDetailPage: React.FC = () => {
  const { topicName, postId } = useParams<{ topicName: string; postId: string }>();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [commentSort, setCommentSort] = useState<'best' | 'top' | 'new' | 'old'>('best');
  const [contentRevealed, setContentRevealed] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm] = Form.useForm();
  const [editContent, setEditContent] = useState('');
  const [selectedTagId, setSelectedTagId] = useState<string | undefined>(undefined);

  // Fetch post data
  const { data: post, isLoading, error } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => postApi.getById(postId!),
    enabled: !!postId,
  });

  // Fetch comments
  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ['post', postId, 'comments', commentSort],
    queryFn: () => postApi.getComments(postId!, commentSort),
    enabled: !!postId,
  });

  // Fetch tags for the topic (for edit modal)
  const { data: tagsData } = useQuery({
    queryKey: ['topic', post?.topic?.id, 'tags'],
    queryFn: () => tagApi.getTopicTags(post!.topic.id),
    enabled: !!post?.topic?.id && editModalVisible,
  });

  const tags = tagsData?.tags || [];

  // Upvote post mutation
  const upvotePostMutation = useMutation({
    mutationFn: () => voteApi.upvote(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
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

  // Downvote post mutation
  const downvotePostMutation = useMutation({
    mutationFn: () => voteApi.downvote(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
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

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: ({ content, parentId }: { content: string; parentId?: string }) =>
      postApi.createComment(postId!, content, parentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      toast.success('Comment posted!');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to post comment';
      toast.error(errorMessage);
    },
  });

  // Upvote comment mutation
  const upvoteCommentMutation = useMutation({
    mutationFn: (commentId: string) => voteApi.upvote(undefined, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId, 'comments'] });
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

  // Downvote comment mutation
  const downvoteCommentMutation = useMutation({
    mutationFn: (commentId: string) => voteApi.downvote(undefined, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId, 'comments'] });
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

  // Edit comment mutation
  const editCommentMutation = useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      commentApi.update(commentId, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId, 'comments'] });
      toast.success('Comment updated!');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to update comment';
      toast.error(errorMessage);
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => commentApi.delete(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      toast.success('Comment deleted!');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to delete comment';
      toast.error(errorMessage);
    },
  });

  // Update post mutation
  const updatePostMutation = useMutation({
    mutationFn: (data: { title?: string; content?: string; isNSFW?: boolean; isSpoiler?: boolean; tagId?: string }) =>
      postApi.update(postId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      toast.success('Post updated!');
      setEditModalVisible(false);
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to update post';
      toast.error(errorMessage);
    },
  });

  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: () => postApi.delete(postId!),
    onSuccess: () => {
      toast.success('Post deleted');
      navigate(`/t/${topicName}`);
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to delete post';
      toast.error(errorMessage);
    },
  });

  const isOwner = user?.id === post?.author?.id;

  const handleUpvotePost = () => {
    if (!isAuthenticated) {
      toast.error('Please log in to vote');
      return;
    }
    upvotePostMutation.mutate();
  };

  const handleDownvotePost = () => {
    if (!isAuthenticated) {
      toast.error('Please log in to vote');
      return;
    }
    downvotePostMutation.mutate();
  };

  const handleCreateComment = async (content: string) => {
    if (!isAuthenticated) {
      toast.error('Please log in to comment');
      return;
    }
    createCommentMutation.mutate({ content });
  };

  const handleUpvoteComment = (commentId: string) => {
    if (!isAuthenticated) {
      toast.error('Please log in to vote');
      return;
    }
    upvoteCommentMutation.mutate(commentId);
  };

  const handleDownvoteComment = (commentId: string) => {
    if (!isAuthenticated) {
      toast.error('Please log in to vote');
      return;
    }
    downvoteCommentMutation.mutate(commentId);
  };

  const handleReplyComment = async (commentId: string, content: string) => {
    if (!isAuthenticated) {
      toast.error('Please log in to reply');
      return;
    }
    createCommentMutation.mutate({ content, parentId: commentId });
  };

  const handleEditComment = async (commentId: string, content: string) => {
    if (!isAuthenticated) {
      toast.error('Please log in to edit');
      return;
    }
    editCommentMutation.mutate({ commentId, content });
  };

  const handleDeleteComment = async (commentId: string) => {
    showConfirmModal({
      title: 'Delete Comment',
      content: 'Are you sure you want to delete this comment? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      onConfirm: async () => {
        deleteCommentMutation.mutate(commentId);
      },
    });
  };

  const handleEditPost = () => {
    if (post) {
      editForm.setFieldsValue({
        title: post.title,
        isNSFW: post.isNSFW || false,
        isSpoiler: post.isSpoiler || false,
      });
      setEditContent(post.content || '');
      setSelectedTagId(post.tag?.id || undefined);
      setEditModalVisible(true);
    }
  };

  const handleEditPostSubmit = async () => {
    try {
      const values = await editForm.validateFields();
      updatePostMutation.mutate({
        title: values.title,
        content: post?.type === 'TEXT' ? editContent : undefined,
        isNSFW: values.isNSFW,
        isSpoiler: values.isSpoiler,
        tagId: selectedTagId,
      });
    } catch (error) {
      // Form validation error - handled by form
    }
  };

  const handleDeletePost = () => {
    showConfirmModal({
      title: 'Delete Post',
      content: 'Are you sure you want to delete this post? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      onConfirm: async () => {
        deletePostMutation.mutate();
      },
    });
  };

  const postMenuItems: MenuProps['items'] = [
    ...(isOwner
      ? [
          {
            key: 'edit',
            icon: <EditOutlined />,
            label: 'Edit Post',
            onClick: handleEditPost,
          },
          {
            key: 'delete',
            icon: <DeleteOutlined />,
            label: 'Delete Post',
            danger: true,
            onClick: handleDeletePost,
          },
        ]
      : []),
  ];

  if (isLoading) {
    return (
      <AppLayout>
        <LoadingSpinner />
      </AppLayout>
    );
  }

  if (error || !post) {
    return (
      <AppLayout>
        <ErrorMessage
          message="Failed to load post"
          description={(error as any)?.response?.data?.error || (error as Error)?.message || 'Post not found'}
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['post', postId] })}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Post Card */}
      <Card style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          {/* Vote Buttons */}
          <div style={{ flexShrink: 0 }}>
            <VoteButtons
              voteCount={post.voteCount}
              userVote={post.userVote}
              onUpvote={handleUpvotePost}
              onDownvote={handleDownvotePost}
            />
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Meta Info */}
            <Space size={8} wrap style={{ marginBottom: '12px' }}>
              <Link to={`/t/${post.topic.name}`}>
                <Text strong>t/{post.topic.name}</Text>
              </Link>
              <Text type="secondary">•</Text>
              <Space size={4}>
                <Text type="secondary">Posted by</Text>
                <Link to={`/u/${post.author.username}`}>
                  <Space size={4}>
                    <Avatar username={post.author.username} avatarStyle={post.author.avatarStyle} avatarSeed={post.author.avatarSeed} size="small" />
                    <Text>u/{post.author.username}</Text>
                  </Space>
                </Link>
              </Space>
              <Text type="secondary">•</Text>
              <Tooltip title={formatDateTime(post.createdAt)}>
                <Text type="secondary" style={{ cursor: 'help' }}>{formatRelativeTime(post.createdAt)}</Text>
              </Tooltip>

              {postMenuItems.length > 0 && (
                <>
                  <Text type="secondary">•</Text>
                  <Dropdown menu={{ items: postMenuItems }} trigger={['click']}>
                    <Button type="link" size="small" icon={<MoreOutlined />} />
                  </Dropdown>
                </>
              )}
            </Space>

            {/* Badges */}
            {(post.isPinned || post.isLocked || post.isNSFW || post.isSpoiler || post.tag) && (
              <Space size={4} style={{ marginBottom: '12px' }}>
                {post.tag && (
                  <Tag
                    style={{
                      backgroundColor: post.tag.bgColor || '#1890ff',
                      color: post.tag.textColor || '#ffffff',
                      border: 'none',
                    }}
                  >
                    {post.tag.name}
                  </Tag>
                )}
                {post.isPinned && (
                  <Tag icon={<PushpinOutlined />} color="blue">
                    Pinned
                  </Tag>
                )}
                {post.isLocked && (
                  <Tag icon={<LockOutlined />} color="red">
                    Locked
                  </Tag>
                )}
                {post.isNSFW && <Tag color="error">NSFW</Tag>}
                {post.isSpoiler && <Tag color="warning">Spoiler</Tag>}
              </Space>
            )}

            {/* Title */}
            <Title level={3} style={{ margin: '0 0 16px 0' }}>
              {post.title}
            </Title>

            {/* Content */}
            {(post.isNSFW || post.isSpoiler) && !contentRevealed ? (
              // Blurred content overlay
              <div
                style={{
                  position: 'relative',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '8px',
                  padding: '48px 24px',
                  textAlign: 'center',
                  border: post.isNSFW ? '1px solid #ff4d4f' : '1px solid #faad14',
                }}
              >
                <div style={{ marginBottom: '16px' }}>
                  <EyeInvisibleOutlined style={{ fontSize: '32px', color: post.isNSFW ? '#ff4d4f' : '#faad14' }} />
                </div>
                <Text strong style={{ display: 'block', fontSize: '18px', marginBottom: '8px' }}>
                  {post.isNSFW && post.isSpoiler ? 'NSFW & Spoiler Content' : post.isNSFW ? 'NSFW Content' : 'Spoiler Content'}
                </Text>
                <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
                  This content is hidden. Click the button below to reveal it.
                </Text>
                <Button
                  type="default"
                  icon={<EyeOutlined />}
                  size="large"
                  onClick={() => setContentRevealed(true)}
                >
                  Show Content
                </Button>
              </div>
            ) : (
              <>
                {post.type === 'TEXT' && post.content && (
                  <div
                    dangerouslySetInnerHTML={{ __html: processHtmlContentWithRefs(post.content) }}
                    style={{ fontSize: '16px', lineHeight: '1.6' }}
                  />
                )}

                {post.type === 'LINK' && post.linkUrl && (
                  <a
                    href={post.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#1890ff', fontSize: '16px' }}
                  >
                    {post.linkUrl}
                  </a>
                )}

                {post.type === 'IMAGE' && post.imageUrl && (
                  <img
                    src={post.imageUrl}
                    alt={post.title}
                    style={{ maxWidth: '100%', maxHeight: '600px', objectFit: 'contain' }}
                  />
                )}

                {/* Option to re-hide content */}
                {(post.isNSFW || post.isSpoiler) && contentRevealed && (
                  <Button
                    type="text"
                    icon={<EyeInvisibleOutlined />}
                    size="small"
                    onClick={() => setContentRevealed(false)}
                    style={{ marginTop: '12px' }}
                  >
                    Hide Content
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Comment Form */}
      {isAuthenticated && !post.isLocked && (
        <Card style={{ marginBottom: '16px' }}>
          <Text strong style={{ marginBottom: '12px', display: 'block' }}>
            Add a Comment
          </Text>
          <CommentForm onSubmit={handleCreateComment} />
        </Card>
      )}

      {post.isLocked && (
        <Card style={{ marginBottom: '16px', backgroundColor: '#fff7e6' }}>
          <Space>
            <LockOutlined />
            <Text>This post is locked. New comments cannot be added.</Text>
          </Space>
        </Card>
      )}

      {/* Comments Section */}
      <Card>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>
            Comments ({post.commentCount || 0})
          </Title>

          <Space>
            <Text type="secondary">Sort by:</Text>
            <Select
              value={commentSort}
              onChange={setCommentSort}
              style={{ width: 100 }}
              options={[
                { label: 'Best', value: 'best' },
                { label: 'Top', value: 'top' },
                { label: 'New', value: 'new' },
                { label: 'Old', value: 'old' },
              ]}
            />
          </Space>
        </div>

        <Divider style={{ margin: '16px 0' }} />

        {commentsLoading ? (
          <LoadingSpinner />
        ) : !comments || comments.length === 0 ? (
          <EmptyState description="No comments yet. Be the first to comment!" />
        ) : (
          <CommentTree
            comments={comments}
            currentUserId={user?.id}
            onUpvote={handleUpvoteComment}
            onDownvote={handleDownvoteComment}
            onReply={handleReplyComment}
            onEdit={handleEditComment}
            onDelete={handleDeleteComment}
          />
        )}
      </Card>

      {/* Edit Post Modal */}
      <Modal
        title="Edit Post"
        open={editModalVisible}
        onOk={handleEditPostSubmit}
        onCancel={() => setEditModalVisible(false)}
        okText="Save Changes"
        confirmLoading={updatePostMutation.isPending}
        width={600}
      >
        <Form
          form={editForm}
          layout="vertical"
          autoComplete="off"
        >
          <Form.Item
            name="title"
            label="Title"
            rules={[
              { required: true, message: 'Please enter a title' },
              { max: 300, message: 'Title must be less than 300 characters' },
            ]}
          >
            <Input
              placeholder="Enter a descriptive title"
              maxLength={300}
              showCount
            />
          </Form.Item>

          {post?.type === 'TEXT' && (
            <Form.Item label="Content">
              <RichTextEditor
                value={editContent}
                onChange={setEditContent}
                placeholder="Edit your post content..."
                minHeight={200}
              />
            </Form.Item>
          )}

          {/* Tag Picker */}
          {tags.length > 0 && (
            <Form.Item label="Post Tag (Optional)">
              <Select
                value={selectedTagId}
                onChange={setSelectedTagId}
                placeholder="Select a tag for your post"
                allowClear
                style={{ width: '100%' }}
              >
                {tags.map((tag: any) => (
                  <Select.Option key={tag.id} value={tag.id}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: tag.bgColor || '#1890ff',
                          color: tag.textColor || '#ffffff',
                          fontSize: '12px',
                        }}
                      >
                        {tag.name}
                      </span>
                    </span>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Form.Item label="Content Warnings">
            <Space direction="vertical">
              <Form.Item name="isNSFW" valuePropName="checked" noStyle>
                <Checkbox>Mark as NSFW (Not Safe For Work)</Checkbox>
              </Form.Item>
              <Form.Item name="isSpoiler" valuePropName="checked" noStyle>
                <Checkbox>Mark as Spoiler</Checkbox>
              </Form.Item>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </AppLayout>
  );
};
