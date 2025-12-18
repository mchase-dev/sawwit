import React from 'react';
import { Avatar as AntAvatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';

interface AvatarProps {
  src?: string;
  username?: string;
  avatarStyle?: string;
  avatarSeed?: string;
  size?: number | 'small' | 'default' | 'large';
  style?: React.CSSProperties;
}

// Generate Dicebear URL
const getAvatarUrl = (avatarStyle: string, seed: string) =>
  `https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${encodeURIComponent(seed)}`;

export const Avatar: React.FC<AvatarProps> = ({
  src,
  username,
  avatarStyle,
  avatarSeed,
  size = 'default',
  style,
}) => {
  // Priority: src > avatarStyle+avatarSeed > username fallback
  let avatarSrc = src;
  if (!avatarSrc && avatarStyle && avatarSeed) {
    avatarSrc = getAvatarUrl(avatarStyle, avatarSeed);
  } else if (!avatarSrc && username) {
    // Default fallback using username as seed
    avatarSrc = getAvatarUrl('identicon', username);
  }

  return (
    <AntAvatar
      src={avatarSrc}
      icon={!avatarSrc ? <UserOutlined /> : undefined}
      size={size}
      style={style}
    />
  );
};
