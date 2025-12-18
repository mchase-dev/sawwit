import React, { useState } from 'react';
import { Card, Typography, List, Space, Badge, Button, Modal, Input, Spin } from 'antd';
import { MessageOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout, Avatar, EmptyState, LoadingSpinner, ErrorMessage } from '../components';
import { formatRelativeTime } from '../utils';
import { messageApi } from '../services/api/message.api';
import { searchApi } from '../services/api/search.api';
import { toast } from 'sonner';

const { Title, Text } = Typography;
const { TextArea } = Input;

export const MessagesPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newMessageModalVisible, setNewMessageModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [messageContent, setMessageContent] = useState('');
  const [sending, setSending] = useState(false);

  // Fetch conversations
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['messages', 'conversations'],
    queryFn: () => messageApi.getConversations(),
  });

  const conversations = data?.data || [];

  // Search users for new message
  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ['search', 'users', searchQuery],
    queryFn: () => searchApi.global(searchQuery),
    enabled: searchQuery.length >= 2,
  });

  const users = searchResults?.users || [];

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: () => messageApi.send({ recipientId: selectedUser.id, content: messageContent }),
    onSuccess: () => {
      toast.success('Message sent!');
      queryClient.invalidateQueries({ queryKey: ['messages', 'conversations'] });
      setNewMessageModalVisible(false);
      setSearchQuery('');
      setSelectedUser(null);
      setMessageContent('');
      navigate(`/messages/${selectedUser.username}`);
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to send message';
      toast.error(errorMessage);
    },
  });

  const handleSendNewMessage = async () => {
    if (!selectedUser || !messageContent.trim()) return;
    setSending(true);
    try {
      await sendMessageMutation.mutateAsync();
    } finally {
      setSending(false);
    }
  };

  const handleCloseModal = () => {
    setNewMessageModalVisible(false);
    setSearchQuery('');
    setSelectedUser(null);
    setMessageContent('');
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
          message="Failed to load conversations"
          description={(error as any)?.response?.data?.error || (error as Error)?.message || 'An error occurred'}
          onRetry={refetch}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <Title level={2} style={{ margin: 0 }}>Messages</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setNewMessageModalVisible(true)}
        >
          New Message
        </Button>
      </div>

      <Card>
        {conversations.length === 0 ? (
          <EmptyState
            description="No messages yet. Start a conversation!"
            image={<MessageOutlined style={{ fontSize: '64px', color: '#d9d9d9' }} />}
          />
        ) : (
          <List
            dataSource={conversations}
            renderItem={(conversation: any) => (
              <Link to={`/messages/${conversation.partner.username}`} style={{ display: 'block' }}>
                <List.Item
                  style={{
                    backgroundColor: conversation.unreadCount > 0 ? '#f0f5ff' : 'transparent',
                    padding: '16px',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <List.Item.Meta
                    avatar={
                      <Badge count={conversation.unreadCount} offset={[-5, 5]}>
                        <Avatar
                          username={conversation.partner.username}
                          avatarStyle={conversation.partner.avatarStyle}
                          avatarSeed={conversation.partner.avatarSeed}
                          size="large"
                        />
                      </Badge>
                    }
                    title={
                      <Text strong>u/{conversation.partner.username}</Text>
                    }
                    description={
                      <Space direction="vertical" size={4}>
                        <Text
                          ellipsis
                          style={{
                            color: conversation.unreadCount > 0 ? '#262626' : '#8c8c8c',
                            fontWeight: conversation.unreadCount > 0 ? 500 : 'normal',
                          }}
                        >
                          {conversation.lastMessage.content}
                        </Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {formatRelativeTime(conversation.lastMessage.createdAt)}
                        </Text>
                      </Space>
                    }
                  />
                </List.Item>
              </Link>
            )}
          />
        )}
      </Card>

      {/* New Message Modal */}
      <Modal
        title="New Message"
        open={newMessageModalVisible}
        onCancel={handleCloseModal}
        footer={null}
        width={500}
      >
        {!selectedUser ? (
          <>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Search for a user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ marginBottom: '16px' }}
              autoComplete="off"
              autoFocus
            />
            {searching && (
              <div style={{ textAlign: 'center', padding: '16px' }}>
                <Spin />
              </div>
            )}
            {!searching && searchQuery.length >= 2 && users.length === 0 && (
              <Text type="secondary">No users found</Text>
            )}
            {!searching && users.length > 0 && (
              <List
                dataSource={users}
                renderItem={(user: any) => (
                  <List.Item
                    style={{ cursor: 'pointer', padding: '8px', borderRadius: '4px' }}
                    onClick={() => setSelectedUser(user)}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          username={user.username}
                          avatarStyle={user.avatarStyle}
                          avatarSeed={user.avatarSeed}
                        />
                      }
                      title={`u/${user.username}`}
                    />
                  </List.Item>
                )}
              />
            )}
          </>
        ) : (
          <>
            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Text type="secondary">To:</Text>
              <Space>
                <Avatar
                  username={selectedUser.username}
                  avatarStyle={selectedUser.avatarStyle}
                  avatarSeed={selectedUser.avatarSeed}
                  size="small"
                />
                <Text strong>u/{selectedUser.username}</Text>
              </Space>
              <Button type="link" size="small" onClick={() => setSelectedUser(null)}>
                Change
              </Button>
            </div>
            <TextArea
              placeholder="Type your message..."
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              autoSize={{ minRows: 3, maxRows: 8 }}
              style={{ marginBottom: '16px' }}
              autoComplete="off"
              autoFocus
            />
            <div style={{ textAlign: 'right' }}>
              <Space>
                <Button onClick={handleCloseModal}>Cancel</Button>
                <Button
                  type="primary"
                  onClick={handleSendNewMessage}
                  loading={sending}
                  disabled={!messageContent.trim()}
                >
                  Send Message
                </Button>
              </Space>
            </div>
          </>
        )}
      </Modal>
    </AppLayout>
  );
};
