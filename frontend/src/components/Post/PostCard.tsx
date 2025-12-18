import React, { useState } from 'react';
import { Card, Space, Tag, Button, Typography, Tooltip } from 'antd';
import {
  CommentOutlined,
  ShareAltOutlined,
  BookOutlined,
  PushpinOutlined,
  LockOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { VoteButtons } from '../vote';
import { Avatar } from '../Common';
import { formatRelativeTime, formatDateTime, truncateText } from '../../utils';

const { Text, Paragraph } = Typography;

interface PostCardProps {
  post: {
    id: string;
    slug: string;
    title: string;
    content?: string;
    type: 'text' | 'link' | 'image';
    linkUrl?: string;
    imageUrl?: string;
    author: {
      username: string;
      avatar?: string;
      avatarStyle?: string;
      avatarSeed?: string;
      badge?: {
        text: string;
        textColor?: string;
        bgColor?: string;
      };
    };
    topic: {
      name: string;
    };
    tag?: {
      id: string;
      name: string;
      textColor?: string;
      bgColor?: string;
    };
    voteCount: number;
    commentCount: number;
    isPinned?: boolean;
    isLocked?: boolean;
    isNSFW?: boolean;
    isSpoiler?: boolean;
    createdAt: string;
  };
  userVote?: 'upvote' | 'downvote' | null;
  onUpvote: () => void;
  onDownvote: () => void;
  onSave?: () => void;
  isSaved?: boolean;
  compact?: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  userVote,
  onUpvote,
  onDownvote,
  onSave,
  isSaved = false,
  compact = false,
}) => {
  const [contentRevealed, setContentRevealed] = useState(false);

  // Determine if content should be blurred
  const shouldBlurContent = (post.isNSFW || post.isSpoiler) && !contentRevealed;

  // Get blur reason text
  const getBlurReason = () => {
    if (post.isNSFW && post.isSpoiler) return 'NSFW & Spoiler';
    if (post.isNSFW) return 'NSFW Content';
    if (post.isSpoiler) return 'Spoiler';
    return '';
  };

  return (
    <Card
      style={{ marginBottom: '16px' }}
      bodyStyle={{ padding: '16px' }}
    >
      <div style={{ display: 'flex', gap: '12px' }}>
        {/* Vote Buttons */}
        <div style={{ flexShrink: 0 }}>
          <VoteButtons
            voteCount={post.voteCount}
            userVote={userVote}
            onUpvote={onUpvote}
            onDownvote={onDownvote}
            size={(compact ? 'small' : 'middle') as any}
          />
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Meta Info */}
          <Space size={8} wrap style={{ marginBottom: '8px' }}>
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
                  {post.author.badge && (
                    <Tag
                      style={{
                        margin: 0,
                        padding: '0 6px',
                        fontSize: '11px',
                        lineHeight: '18px',
                        color: post.author.badge.textColor || '#ffffff',
                        backgroundColor: post.author.badge.bgColor || '#1890ff',
                        border: 'none',
                      }}
                    >
                      {post.author.badge.text}
                    </Tag>
                  )}
                </Space>
              </Link>
            </Space>
            <Text type="secondary">•</Text>
            <Tooltip title={formatDateTime(post.createdAt)}>
              <Text type="secondary" style={{ cursor: 'help' }}>{formatRelativeTime(post.createdAt)}</Text>
            </Tooltip>
          </Space>

          {/* Badges */}
          {(post.tag || post.isPinned || post.isLocked || post.isNSFW || post.isSpoiler) && (
            <Space size={4} style={{ marginBottom: '8px' }}>
              {post.tag && (
                <Tag
                  style={{
                    margin: 0,
                    color: post.tag.textColor || '#ffffff',
                    backgroundColor: post.tag.bgColor || '#1890ff',
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
              {post.isNSFW && (
                <Tag color="error">NSFW</Tag>
              )}
              {post.isSpoiler && (
                <Tag color="warning">Spoiler</Tag>
              )}
            </Space>
          )}

          {/* Title */}
          <Link to={`/t/${post.topic.name}/post/${post.slug}`}>
            <Typography.Title
              level={5}
              style={{ margin: '0 0 8px 0', cursor: 'pointer' }}
            >
              {post.title}
            </Typography.Title>
          </Link>

          {/* Content Preview */}
          {shouldBlurContent ? (
            // Blurred content overlay
            <div
              style={{
                position: 'relative',
                marginBottom: '12px',
                backgroundColor: '#f5f5f5',
                borderRadius: '8px',
                padding: '24px',
                textAlign: 'center',
                border: post.isNSFW ? '1px solid #ff4d4f' : '1px solid #faad14',
              }}
            >
              <div style={{ marginBottom: '12px' }}>
                <EyeInvisibleOutlined style={{ fontSize: '24px', color: post.isNSFW ? '#ff4d4f' : '#faad14' }} />
              </div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                {getBlurReason()}
              </Text>
              <Text type="secondary" style={{ display: 'block', marginBottom: '12px' }}>
                Click to reveal this content
              </Text>
              <Button
                type="default"
                icon={<EyeOutlined />}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setContentRevealed(true);
                }}
              >
                Show Content
              </Button>
            </div>
          ) : (
            <>
              {!compact && post.type === 'text' && post.content && (
                <Paragraph
                  ellipsis={{ rows: 3 }}
                  style={{ color: '#595959', marginBottom: '12px' }}
                >
                  {post.content}
                </Paragraph>
              )}

              {post.type === 'link' && post.linkUrl && (
                <a
                  href={post.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#1890ff', marginBottom: '12px', display: 'block' }}
                >
                  {truncateText(post.linkUrl, 80)}
                </a>
              )}

              {post.type === 'image' && post.imageUrl && !compact && (
                <div style={{ marginBottom: '12px' }}>
                  <img
                    src={post.imageUrl}
                    alt={post.title}
                    style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }}
                  />
                </div>
              )}
            </>
          )}

          {/* Actions */}
          <Space size={16}>
            <Link to={`/t/${post.topic.name}/post/${post.slug}`}>
              <Button type="text" icon={<CommentOutlined />} size="small">
                {post.commentCount} Comments
              </Button>
            </Link>

            <Button type="text" icon={<ShareAltOutlined />} size="small">
              Share
            </Button>

            {onSave && (
              <Button
                type="text"
                icon={<BookOutlined />}
                size="small"
                onClick={onSave}
                style={{ color: isSaved ? '#1890ff' : undefined }}
              >
                {isSaved ? 'Saved' : 'Save'}
              </Button>
            )}
          </Space>
        </div>
      </div>
    </Card>
  );
};
