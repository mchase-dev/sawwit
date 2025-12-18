import React, { useState } from 'react';
import { Space, Button, Typography, Dropdown, Tag, Tooltip, Input } from 'antd';
import {
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  CommentOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { VoteButtons } from '../vote';
import { Avatar } from '../Common';
import { formatRelativeTime, formatDateTime, processHtmlContentWithRefs } from '../../utils';
import type { MenuProps } from 'antd';

const { Text } = Typography;
const { TextArea } = Input;

interface CommentItemProps {
  comment: {
    id: string;
    content: string;
    author: {
      id: string;
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
    voteCount: number;
    createdAt: string;
    updatedAt?: string;
  };
  userVote?: 'upvote' | 'downvote' | null;
  onUpvote: () => void;
  onDownvote: () => void;
  onReply?: () => void;
  onEdit?: (newContent: string) => Promise<void>;
  onDelete?: () => void;
  isEditing?: boolean;
  onStartEdit?: () => void;
  onCancelEdit?: () => void;
  isOwner?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  depth?: number;
  children?: React.ReactNode;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  userVote,
  onUpvote,
  onDownvote,
  onReply,
  onEdit,
  onDelete,
  isEditing = false,
  onStartEdit,
  onCancelEdit,
  isOwner = false,
  isCollapsed = false,
  onToggleCollapse,
  depth = 0,
  children,
}) => {
  const [editContent, setEditContent] = useState(comment.content);
  const [saving, setSaving] = useState(false);

  const handleSaveEdit = async () => {
    if (!onEdit || !editContent.trim()) return;
    setSaving(true);
    try {
      await onEdit(editContent.trim());
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditContent(comment.content);
    onCancelEdit?.();
  };

  const menuItems: MenuProps['items'] = [
    ...(isOwner
      ? [
          {
            key: 'edit',
            icon: <EditOutlined />,
            label: 'Edit',
            onClick: onStartEdit,
          },
          {
            key: 'delete',
            icon: <DeleteOutlined />,
            label: 'Delete',
            danger: true,
            onClick: onDelete,
          },
        ]
      : []),
  ];

  const hasMenu = menuItems.length > 0;

  if (isCollapsed) {
    return (
      <div
        style={{
          marginLeft: `${depth * 20}px`,
          marginBottom: '8px',
          padding: '8px',
          backgroundColor: '#fafafa',
          borderLeft: '2px solid #d9d9d9',
          cursor: 'pointer',
        }}
        onClick={onToggleCollapse}
      >
        <Space>
          <Text type="secondary" strong>
            [+]
          </Text>
          <Text type="secondary">
            u/{comment.author.username} (collapsed)
          </Text>
        </Space>
      </div>
    );
  }

  return (
    <div
      style={{
        marginLeft: `${depth * 20}px`,
        marginBottom: '12px',
        borderLeft: depth > 0 ? '2px solid #e8e8e8' : 'none',
        paddingLeft: depth > 0 ? '12px' : '0',
      }}
    >
      <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
        {/* Vote Buttons */}
        <div style={{ flexShrink: 0 }}>
          <VoteButtons
            voteCount={comment.voteCount}
            userVote={userVote}
            onUpvote={onUpvote}
            onDownvote={onDownvote}
            direction="horizontal"
            size="small"
          />
        </div>

        {/* Comment Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header */}
          <Space size={8} style={{ marginBottom: '8px' }}>
            <Link to={`/u/${comment.author.username}`}>
              <Space size={4}>
                <Avatar username={comment.author.username} avatarStyle={comment.author.avatarStyle} avatarSeed={comment.author.avatarSeed} size="small" />
                <Text strong>u/{comment.author.username}</Text>
                {comment.author.badge && (
                  <Tag
                    style={{
                      margin: 0,
                      padding: '0 6px',
                      fontSize: '11px',
                      lineHeight: '18px',
                      color: comment.author.badge.textColor || '#ffffff',
                      backgroundColor: comment.author.badge.bgColor || '#1890ff',
                      border: 'none',
                    }}
                  >
                    {comment.author.badge.text}
                  </Tag>
                )}
              </Space>
            </Link>
            <Text type="secondary">•</Text>
            <Tooltip title={formatDateTime(comment.createdAt)}>
              <Text type="secondary" style={{ cursor: 'help' }}>{formatRelativeTime(comment.createdAt)}</Text>
            </Tooltip>
            {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
              <>
                <Text type="secondary">•</Text>
                <Text type="secondary" italic>
                  edited
                </Text>
              </>
            )}
            {onToggleCollapse && (
              <>
                <Text type="secondary">•</Text>
                <Button
                  type="link"
                  size="small"
                  onClick={onToggleCollapse}
                  style={{ padding: 0, height: 'auto', fontSize: '12px' }}
                >
                  [-]
                </Button>
              </>
            )}
          </Space>

          {/* Content */}
          {isEditing ? (
            <div style={{ marginBottom: '8px' }}>
              <TextArea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                autoSize={{ minRows: 2, maxRows: 10 }}
                style={{ marginBottom: '8px' }}
                disabled={saving}
                autoFocus
                autoComplete="off"
              />
              <Space>
                <Button
                  type="primary"
                  size="small"
                  icon={<CheckOutlined />}
                  onClick={handleSaveEdit}
                  loading={saving}
                  disabled={!editContent.trim()}
                >
                  Save
                </Button>
                <Button
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </Space>
            </div>
          ) : (
            <div
              style={{ marginBottom: '8px', wordBreak: 'break-word' }}
              dangerouslySetInnerHTML={{ __html: processHtmlContentWithRefs(comment.content) }}
            />
          )}

          {/* Actions */}
          {!isEditing && (
            <Space size={12}>
              {onReply && (
                <Button type="link" size="small" icon={<CommentOutlined />} onClick={onReply}>
                  Reply
                </Button>
              )}

              {hasMenu && (
                <Dropdown menu={{ items: menuItems }} trigger={['click']}>
                  <Button type="link" size="small" icon={<MoreOutlined />} />
                </Dropdown>
              )}
            </Space>
          )}
        </div>
      </div>

      {/* Nested Comments */}
      {children && <div>{children}</div>}
    </div>
  );
};
