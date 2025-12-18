import React, { useState, useEffect, useRef } from 'react';
import { Card, Typography, Button, Input, Space } from 'antd';
import { ArrowLeftOutlined, SendOutlined } from '@ant-design/icons';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout, Avatar, LoadingSpinner, ErrorMessage } from '../components';
import { useAuth } from '../contexts';
import { formatRelativeTime, formatDateTime, parseContentWithRefs } from '../utils';
import { messageApi } from '../services/api/message.api';
import { userApi } from '../services/api/user.api';
import { toast } from 'sonner';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface Message {
  id: string;
  content: string;
  senderId: string;
  recipientId: string;
  isRead: boolean;
  createdAt: string;
  sender: {
    id: string;
    username: string;
    avatarStyle?: string;
    avatarSeed?: string;
  };
  recipient: {
    id: string;
    username: string;
    avatarStyle?: string;
    avatarSeed?: string;
  };
}

export const ConversationPage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Fetch the other user's profile to get their ID
  const { data: otherUser, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ['user', username],
    queryFn: () => userApi.getByUsername(username!),
    enabled: !!username,
  });

  // Fetch conversation messages
  const { data: messagesData, isLoading: messagesLoading, error: messagesError, refetch } = useQuery({
    queryKey: ['conversation', otherUser?.id],
    queryFn: () => messageApi.getConversation(otherUser!.id),
    enabled: !!otherUser?.id,
    refetchInterval: 10000, // Poll every 10 seconds for new messages
  });

  const messages: Message[] = messagesData?.data || [];

  // Mark conversation as read when viewing
  useEffect(() => {
    if (otherUser?.id && messages.some(m => m.senderId === otherUser.id && !m.isRead)) {
      messageApi.markAsRead(otherUser.id).then(() => {
        queryClient.invalidateQueries({ queryKey: ['messages', 'unread'] });
        queryClient.invalidateQueries({ queryKey: ['messages', 'conversations'] });
      });
    }
  }, [otherUser?.id, messages, queryClient]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (content: string) =>
      messageApi.send({ recipientId: otherUser!.id, content }),
    onSuccess: () => {
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['conversation', otherUser?.id] });
      queryClient.invalidateQueries({ queryKey: ['messages', 'conversations'] });
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to send message';
      toast.error(errorMessage);
    },
  });

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !otherUser?.id) return;
    setSending(true);
    try {
      await sendMessageMutation.mutateAsync(newMessage.trim());
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (userLoading || messagesLoading) {
    return (
      <AppLayout>
        <LoadingSpinner />
      </AppLayout>
    );
  }

  if (userError || !otherUser) {
    return (
      <AppLayout>
        <ErrorMessage
          message="User not found"
          description="The user you're trying to message doesn't exist."
          onRetry={() => navigate('/messages')}
        />
      </AppLayout>
    );
  }

  if (messagesError) {
    return (
      <AppLayout>
        <ErrorMessage
          message="Failed to load conversation"
          description={(messagesError as any)?.response?.data?.error || 'An error occurred'}
          onRetry={refetch}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Header */}
      <Card style={{ marginBottom: '16px' }}>
        <Space>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/messages')}
          />
          <Link to={`/u/${otherUser.username}`}>
            <Space>
              <Avatar
                username={otherUser.username}
                avatarStyle={otherUser.avatarStyle}
                avatarSeed={otherUser.avatarSeed}
                size="default"
              />
              <Title level={4} style={{ margin: 0 }}>
                u/{otherUser.username}
              </Title>
            </Space>
          </Link>
        </Space>
      </Card>

      {/* Messages */}
      <Card
        style={{
          marginBottom: '16px',
          minHeight: '400px',
          maxHeight: '60vh',
          overflow: 'auto',
        }}
        bodyStyle={{ padding: '16px' }}
      >
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#8c8c8c' }}>
            <Text type="secondary">No messages yet. Start the conversation!</Text>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((message) => {
              const isOwn = message.senderId === user?.id;
              return (
                <div
                  key={message.id}
                  style={{
                    display: 'flex',
                    justifyContent: isOwn ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '70%',
                      display: 'flex',
                      flexDirection: isOwn ? 'row-reverse' : 'row',
                      gap: '8px',
                      alignItems: 'flex-end',
                    }}
                  >
                    {!isOwn && (
                      <Avatar
                        username={message.sender.username}
                        avatarStyle={message.sender.avatarStyle}
                        avatarSeed={message.sender.avatarSeed}
                        size="small"
                      />
                    )}
                    <div>
                      <div
                        style={{
                          backgroundColor: isOwn ? '#1890ff' : '#f0f0f0',
                          color: isOwn ? '#fff' : '#262626',
                          padding: '10px 14px',
                          borderRadius: isOwn
                            ? '18px 18px 4px 18px'
                            : '18px 18px 18px 4px',
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap',
                        }}
                        dangerouslySetInnerHTML={{ __html: parseContentWithRefs(message.content) }}
                      />
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#8c8c8c',
                          marginTop: '4px',
                          textAlign: isOwn ? 'right' : 'left',
                        }}
                        title={formatDateTime(message.createdAt)}
                      >
                        {formatRelativeTime(message.createdAt)}
                        {isOwn && message.isRead && (
                          <span style={{ marginLeft: '4px' }}>Read</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </Card>

      {/* Message Input */}
      <Card>
        <div style={{ display: 'flex', gap: '12px' }}>
          <TextArea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
            autoSize={{ minRows: 1, maxRows: 4 }}
            style={{ flex: 1 }}
            disabled={sending}
            autoComplete="off"
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSendMessage}
            loading={sending}
            disabled={!newMessage.trim()}
          >
            Send
          </Button>
        </div>
      </Card>
    </AppLayout>
  );
};
