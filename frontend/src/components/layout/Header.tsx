import React from 'react';
import { Layout, Input, Badge, Dropdown, Space, Button } from 'antd';
import {
  SearchOutlined,
  BellOutlined,
  MessageOutlined,
  UserOutlined,
  LoginOutlined,
  LogoutOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts';
import { Avatar } from '../Common';
import { useUnreadCount } from '../../hooks/useMessages';
import { useNotificationUnreadCount } from '../../hooks/useNotifications';
import type { MenuProps } from 'antd';
import logoSvg from '../../assets/logo.svg';

const { Header: AntHeader } = Layout;

export const Header: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch unread counts
  const { data: unreadMessagesCount } = useUnreadCount();
  const { data: unreadNotificationsCount } = useNotificationUnreadCount();

  const handleSearch = (value: string) => {
    if (value.trim()) {
      navigate(`/search?q=${encodeURIComponent(value.trim())}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: <Link to={`/u/${user?.username}`}>Profile</Link>,
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: <Link to="/settings">Settings</Link>,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout,
    },
  ];

  // Hide search bar on auth pages
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <AntHeader
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        backgroundColor: '#fff',
        borderBottom: '1px solid #f0f0f0',
      }}
    >
      {/* Logo */}
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '24px', flexShrink: 0 }}>
        <img src={logoSvg} alt="Sawwit" style={{ height: '32px', width: '32px' }} />
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#0079D3', whiteSpace: 'nowrap' }}>
          Sawwit
        </h1>
      </Link>

      {/* Search Bar - hidden on auth pages */}
      {!isAuthPage && (
        <Input.Search
          placeholder="Search topics, posts, users..."
          prefix={<SearchOutlined />}
          onSearch={handleSearch}
          style={{ maxWidth: '400px', flex: '1 1 auto', minWidth: 0 }}
          allowClear
          autoComplete="off"
        />
      )}

      {/* Right Side Actions */}
      <Space size="large" style={{ marginLeft: '24px', flexShrink: 0 }}>
        {isAuthenticated ? (
          <>
            {/* Messages */}
            <Link to="/messages">
              <Badge count={unreadMessagesCount || 0} size="small">
                <MessageOutlined style={{ fontSize: '20px', color: '#595959' }} />
              </Badge>
            </Link>

            {/* Notifications */}
            <Link to="/notifications">
              <Badge count={unreadNotificationsCount || 0} size="small">
                <BellOutlined style={{ fontSize: '20px', color: '#595959' }} />
              </Badge>
            </Link>

            {/* User Menu */}
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Avatar username={user?.username} avatarStyle={user?.avatarStyle} avatarSeed={user?.avatarSeed} size="default" />
                <span>{user?.username}</span>
              </div>
            </Dropdown>
          </>
        ) : (
          <>
            <Link to="/login">
              <Button type="default" icon={<LoginOutlined />}>
                Log In
              </Button>
            </Link>
            <Link to="/register">
              <Button type="primary">Sign Up</Button>
            </Link>
          </>
        )}
      </Space>
    </AntHeader>
  );
};
