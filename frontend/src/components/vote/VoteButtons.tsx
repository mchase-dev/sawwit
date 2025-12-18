import React from 'react';
import { Space, Button } from 'antd';
import { UpOutlined, DownOutlined } from '@ant-design/icons';
import { formatVoteCount } from '../../utils';

type ButtonSize = 'small' | 'middle' | 'large';

interface VoteButtonsProps {
  voteCount: number;
  userVote?: 'upvote' | 'downvote' | null;
  onUpvote: () => void;
  onDownvote: () => void;
  size?: ButtonSize;
  direction?: 'horizontal' | 'vertical';
  disabled?: boolean;
}

export const VoteButtons: React.FC<VoteButtonsProps> = ({
  voteCount,
  userVote,
  onUpvote,
  onDownvote,
  size = 'default',
  direction = 'vertical',
  disabled = false,
}) => {
  const upvoteColor = userVote === 'upvote' ? '#52c41a' : '#8c8c8c';
  const downvoteColor = userVote === 'downvote' ? '#ff4d4f' : '#8c8c8c';

  const voteCountColor = userVote === 'upvote'
    ? '#52c41a'
    : userVote === 'downvote'
    ? '#ff4d4f'
    : '#262626';

  return (
    <Space
      direction={direction}
      size={size === 'small' ? 4 : 8}
      style={{
        alignItems: 'center',
      }}
    >
      <Button
        type="text"
        icon={<UpOutlined />}
        onClick={onUpvote}
        disabled={disabled}
        size={size as any}
        style={{
          color: upvoteColor,
          padding: size === 'small' ? '4px' : '8px',
        }}
      />

      <div
        style={{
          fontSize: size === 'small' ? '12px' : '14px',
          fontWeight: 'bold',
          color: voteCountColor,
          minWidth: size === 'small' ? '30px' : '40px',
          textAlign: 'center',
        }}
      >
        {formatVoteCount(voteCount)}
      </div>

      <Button
        type="text"
        icon={<DownOutlined />}
        onClick={onDownvote}
        disabled={disabled}
        size={size as any}
        style={{
          color: downvoteColor,
          padding: size === 'small' ? '4px' : '8px',
        }}
      />
    </Space>
  );
};
