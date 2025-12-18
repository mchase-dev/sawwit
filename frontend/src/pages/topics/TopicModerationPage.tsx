import React, { useState } from 'react';
import { Card, Tabs, Typography, Button, Space, Table, Input, Form, Modal, Tag } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout, LoadingSpinner, ErrorMessage } from '../../components';
import { useAuth } from '../../contexts';
import { topicApi } from '../../services/api/topic.api';
import { tagApi } from '../../services/api/tag.api';
import { badgeApi } from '../../services/api/badge.api';
import { toast } from 'sonner';
import { DeleteOutlined, EditOutlined, PlusOutlined, UserDeleteOutlined, UserAddOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { TextArea } = Input;

export const TopicModerationPage: React.FC = () => {
  const { topicName } = useParams<{ topicName: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('settings');

  // Fetch topic
  const { data: topic, isLoading, error } = useQuery({
    queryKey: ['topic', topicName],
    queryFn: () => topicApi.getByName(topicName!),
    enabled: !!topicName,
  });

  // Check if user is owner or moderator
  const isOwner = topic?.ownerId === user?.id;
  const isModerator = topic?.memberRole === 'MODERATOR' || isOwner;

  if (isLoading) {
    return (
      <AppLayout>
        <LoadingSpinner />
      </AppLayout>
    );
  }

  if (error || !topic) {
    return (
      <AppLayout>
        <ErrorMessage
          message="Failed to load topic"
          description="Topic not found or you don't have permission to access this page"
          onRetry={() => navigate(`/t/${topicName}`)}
        />
      </AppLayout>
    );
  }

  if (!isModerator) {
    return (
      <AppLayout>
        <ErrorMessage
          message="Access Denied"
          description="You must be a moderator or owner to access this page"
          onRetry={() => navigate(`/t/${topicName}`)}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Card>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>
              Moderate t/{topic.name}
            </Title>
            <Text type="secondary">Manage topic settings, members, and content</Text>
          </div>

          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              ...(isOwner
                ? [
                    {
                      key: 'settings',
                      label: 'Settings',
                      children: <TopicSettingsTab topic={topic} />,
                    },
                  ]
                : []),
              ...(isOwner
                ? [
                    {
                      key: 'moderators',
                      label: 'Moderators',
                      children: <ModeratorsTab topic={topic} />,
                    },
                  ]
                : []),
              {
                key: 'banned',
                label: 'Banned Users',
                children: <BannedUsersTab topic={topic} />,
              },
              {
                key: 'tags',
                label: 'Post Tags',
                children: <PostTagsTab topic={topic} />,
              },
              {
                key: 'badges',
                label: 'User Badges',
                children: <UserBadgesTab topic={topic} />,
              },
            ]}
          />
        </Space>
      </Card>
    </AppLayout>
  );
};

// Topic Settings Tab (Owner only)
const TopicSettingsTab: React.FC<{ topic: any }> = ({ topic }) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data: any) => topicApi.update(topic.name, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topic', topic.name] });
      toast.success('Topic updated successfully!');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to update topic';
      toast.error(errorMessage);
    },
  });

  const handleSubmit = async (values: any) => {
    await updateMutation.mutateAsync(values);
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      autoComplete="off"
      initialValues={{
        displayName: topic.displayName || topic.name,
        description: topic.description || '',
        rules: topic.rules || '',
      }}
    >
      <Form.Item
        name="displayName"
        label="Display Name"
        rules={[
          { required: true, message: 'Please enter a display name' },
          { min: 3, message: 'Display name must be at least 3 characters' },
        ]}
      >
        <Input placeholder="Topic Display Name" autoComplete="off" />
      </Form.Item>

      <Form.Item
        name="description"
        label="Description"
        rules={[
          { required: true, message: 'Please enter a description' },
          { max: 500, message: 'Description must be less than 500 characters' },
        ]}
      >
        <TextArea
          placeholder="Describe what this topic is about..."
          autoSize={{ minRows: 3, maxRows: 6 }}
          maxLength={500}
          showCount
          autoComplete="off"
        />
      </Form.Item>

      <Form.Item
        name="rules"
        label="Rules"
        rules={[{ max: 5000, message: 'Rules must be less than 5000 characters' }]}
      >
        <TextArea
          placeholder="Topic rules (optional)..."
          autoSize={{ minRows: 5, maxRows: 10 }}
          maxLength={5000}
          showCount
          autoComplete="off"
        />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>
          Update Topic
        </Button>
      </Form.Item>
    </Form>
  );
};

// Moderators Tab (Owner only)
const ModeratorsTab: React.FC<{ topic: any }> = ({ topic }) => {
  const [searchUsername, setSearchUsername] = useState('');
  const queryClient = useQueryClient();

  // For now, we'll need to fetch topic members
  // This would require a new API endpoint to get topic members
  // For MVP, we'll show a simple interface

  const appointMutation = useMutation({
    mutationFn: (userId: string) => topicApi.appointModerator(topic.name, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topic', topic.name] });
      toast.success('Moderator appointed successfully!');
      setSearchUsername('');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to appoint moderator';
      toast.error(errorMessage);
    },
  });

  // Reserved for future use
  // const removeMutation = useMutation({
  //   mutationFn: (userId: string) => topicApi.removeModerator(topic.name, userId),
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({ queryKey: ['topic', topic.name] });
  //     toast.success('Moderator removed successfully!');
  //   },
  //   onError: (error: any) => {
  //     const errorData = error.response?.data?.error;
  //     const errorMessage = typeof errorData === 'string'
  //       ? errorData
  //       : errorData?.message || error.message || 'Failed to remove moderator';
  //     toast.error(errorMessage);
  //   },
  // });

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Text type="secondary">
        Moderators can manage posts, comments, ban users, create tags and award badges.
      </Text>

      <Card title="Appoint Moderator" size="small">
        <Space.Compact style={{ width: '100%' }}>
          <Input
            placeholder="Enter username to appoint as moderator"
            value={searchUsername}
            onChange={(e) => setSearchUsername(e.target.value)}
          />
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={() => {
              if (searchUsername.trim()) {
                appointMutation.mutate(searchUsername.trim());
              } else {
                toast.error('Please enter a username');
              }
            }}
            loading={appointMutation.isPending}
          >
            Appoint
          </Button>
        </Space.Compact>
        <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '8px' }}>
          Note: User must be a member of the topic
        </Text>
      </Card>

      <Card title="Current Moderators" size="small">
        <Text type="secondary">
          Moderator list feature coming soon.
        </Text>
      </Card>
    </Space>
  );
};

// Banned Users Tab
const BannedUsersTab: React.FC<{ topic: any }> = ({ topic }) => {
  const [username, setUsername] = useState('');
  const queryClient = useQueryClient();

  // Fetch banned users
  const { data: bannedUsers, isLoading } = useQuery({
    queryKey: ['topic', topic.name, 'banned'],
    queryFn: () => topicApi.getBannedUsers(topic.name),
  });

  const banMutation = useMutation({
    mutationFn: (userId: string) => topicApi.banUser(topic.name, { userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topic', topic.name] });
      queryClient.invalidateQueries({ queryKey: ['topic', topic.name, 'banned'] });
      toast.success('User banned successfully!');
      setUsername('');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to ban user';
      toast.error(errorMessage);
    },
  });

  const unbanMutation = useMutation({
    mutationFn: (uname: string) => topicApi.unbanUser(topic.name, uname),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topic', topic.name] });
      queryClient.invalidateQueries({ queryKey: ['topic', topic.name, 'banned'] });
      toast.success('User unbanned successfully!');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to unban user';
      toast.error(errorMessage);
    },
  });

  const columns = [
    {
      title: 'User',
      dataIndex: ['user', 'username'],
      key: 'username',
      render: (username: string) => `u/${username}`,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Button
          size="small"
          icon={<UserAddOutlined />}
          onClick={() => {
            Modal.confirm({
              title: 'Unban User',
              content: `Are you sure you want to unban u/${record.user?.username}?`,
              onOk: () => unbanMutation.mutate(record.user?.username),
            });
          }}
          loading={unbanMutation.isPending}
        >
          Unban
        </Button>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card title="Ban User" size="small">
        <Space.Compact style={{ width: '100%' }}>
          <Input
            placeholder="Enter username to ban"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Button
            danger
            icon={<UserDeleteOutlined />}
            onClick={() => {
              if (username.trim()) {
                banMutation.mutate(username.trim());
              } else {
                toast.error('Please enter a username');
              }
            }}
            loading={banMutation.isPending}
          >
            Ban
          </Button>
        </Space.Compact>
        <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '8px' }}>
          Banned users cannot post or comment in this topic
        </Text>
      </Card>

      <Card title="Banned Users" size="small">
        <Table
          columns={columns}
          dataSource={bannedUsers || []}
          loading={isLoading}
          rowKey="userId"
          pagination={false}
          locale={{ emptyText: 'No banned users' }}
        />
      </Card>
    </Space>
  );
};

// Post Tags Tab
const PostTagsTab: React.FC<{ topic: any }> = ({ topic }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTag, setEditingTag] = useState<any>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: tags, isLoading } = useQuery({
    queryKey: ['tags', topic.id],
    queryFn: () => tagApi.getTopicTags(topic.id),
  });

  const createMutation = useMutation({
    mutationFn: (data: { text: string; textColor?: string; bgColor?: string }) => tagApi.create(topic.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags', topic.id] });
      toast.success('Tag created successfully!');
      setIsModalVisible(false);
      form.resetFields();
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to create tag';
      toast.error(errorMessage);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => tagApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags', topic.id] });
      toast.success('Tag updated successfully!');
      setIsModalVisible(false);
      setEditingTag(null);
      form.resetFields();
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to update tag';
      toast.error(errorMessage);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tagApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags', topic.id] });
      toast.success('Tag deleted successfully!');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to delete tag';
      toast.error(errorMessage);
    },
  });

  const handleSubmit = async (values: any) => {
    if (editingTag) {
      await updateMutation.mutateAsync({ id: editingTag.id, data: values });
    } else {
      await createMutation.mutateAsync(values);
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: any) => (
        <Tag color={record.color}>{text}</Tag>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingTag(record);
              form.setFieldsValue(record);
              setIsModalVisible(true);
            }}
          >
            Edit
          </Button>
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              Modal.confirm({
                title: 'Delete Tag',
                content: `Are you sure you want to delete the tag "${record.name}"?`,
                onOk: () => deleteMutation.mutate(record.id),
              });
            }}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text type="secondary">Create tags to categorize posts in this topic</Text>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingTag(null);
            form.resetFields();
            setIsModalVisible(true);
          }}
        >
          Create Tag
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={tags?.tags || []}
        loading={isLoading}
        rowKey="id"
        pagination={false}
      />

      <Modal
        title={editingTag ? 'Edit Tag' : 'Create Tag'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingTag(null);
          form.resetFields();
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} autoComplete="off">
          <Form.Item
            name="name"
            label="Tag Name"
            rules={[
              { required: true, message: 'Please enter a tag name' },
              { min: 2, message: 'Tag name must be at least 2 characters' },
              { max: 20, message: 'Tag name must be less than 20 characters' },
            ]}
          >
            <Input placeholder="e.g., Discussion, Question, News" autoComplete="off" />
          </Form.Item>

          <Form.Item
            name="color"
            label="Color"
            rules={[{ required: true, message: 'Please select a color' }]}
          >
            <Input placeholder="#1890ff" autoComplete="off" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ max: 200, message: 'Description must be less than 200 characters' }]}
          >
            <TextArea placeholder="Optional description..." maxLength={200} autoComplete="off" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingTag ? 'Update Tag' : 'Create Tag'}
              </Button>
              <Button
                onClick={() => {
                  setIsModalVisible(false);
                  setEditingTag(null);
                  form.resetFields();
                }}
              >
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
};

// User Badges Tab
const UserBadgesTab: React.FC<{ topic: any }> = ({ topic }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: badges, isLoading } = useQuery({
    queryKey: ['badges', topic.id],
    queryFn: () => badgeApi.getTopicBadges(topic.id),
  });

  const awardMutation = useMutation({
    mutationFn: (data: any) => badgeApi.award({ topicId: topic.id, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badges', topic.id] });
      toast.success('Badge awarded successfully!');
      setIsModalVisible(false);
      form.resetFields();
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to award badge';
      toast.error(errorMessage);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => badgeApi.remove(topic.id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badges', topic.id] });
      toast.success('Badge removed successfully!');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to remove badge';
      toast.error(errorMessage);
    },
  });

  const handleSubmit = async (values: any) => {
    await awardMutation.mutateAsync(values);
  };

  const columns = [
    {
      title: 'User',
      dataIndex: ['user', 'username'],
      key: 'username',
      render: (username: string) => `u/${username}`,
    },
    {
      title: 'Badge',
      dataIndex: 'text',
      key: 'badge',
      render: (text: string, record: any) => (
        <Tag color={record.bgColor} style={{ color: record.textColor }}>
          {text}
        </Tag>
      ),
    },
    {
      title: 'Awarded By',
      dataIndex: ['awardedByUser', 'username'],
      key: 'awardedBy',
      render: (username: string) => `u/${username}`,
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Button
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => {
            Modal.confirm({
              title: 'Remove Badge',
              content: `Are you sure you want to remove this badge from u/${record.user?.username}?`,
              onOk: () => removeMutation.mutate(record.userId),
            });
          }}
        >
          Remove
        </Button>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text type="secondary">Award badges to recognize valuable contributors</Text>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            form.resetFields();
            setIsModalVisible(true);
          }}
        >
          Award Badge
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={badges?.badges || []}
        loading={isLoading}
        rowKey="id"
        pagination={false}
      />

      <Modal
        title="Award Badge"
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} autoComplete="off">
          <Form.Item
            name="userId"
            label="Username"
            rules={[{ required: true, message: 'Please enter a username' }]}
          >
            <Input placeholder="Username to award badge to" autoComplete="off" />
          </Form.Item>

          <Form.Item
            name="text"
            label="Badge Text"
            rules={[
              { required: true, message: 'Please enter badge text' },
              { max: 20, message: 'Badge text must be less than 20 characters' },
            ]}
          >
            <Input placeholder="e.g., Contributor, Expert, Helper" maxLength={20} autoComplete="off" />
          </Form.Item>

          <Form.Item name="textColor" label="Text Color" initialValue="#ffffff">
            <Input placeholder="#ffffff" autoComplete="off" />
          </Form.Item>

          <Form.Item name="bgColor" label="Background Color" initialValue="#1890ff">
            <Input placeholder="#1890ff" autoComplete="off" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={awardMutation.isPending}>
                Award Badge
              </Button>
              <Button
                onClick={() => {
                  setIsModalVisible(false);
                  form.resetFields();
                }}
              >
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
};
