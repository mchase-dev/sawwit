import React, { useState } from 'react';
import { Card, Typography, List, Space, Button, Switch, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout, LoadingSpinner, ErrorMessage, EmptyState, showConfirmModal } from '../../components';
import { automodApi } from '../../services/api/automod.api';
import { topicApi } from '../../services/api/topic.api';
import { RuleFormModal } from './RuleFormModal';
import { toast } from 'sonner';

const { Title, Text, Paragraph } = Typography;

interface AutomodRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  conditions: Array<{
    type: string;
    value: any;
  }>;
  actions: Array<{
    type: string;
    value: any;
  }>;
  triggeredCount: number;
}

export const AutomodPage: React.FC = () => {
  const { topicName } = useParams<{ topicName: string }>();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch topic to get topicId
  const { data: topic } = useQuery({
    queryKey: ['topic', topicName],
    queryFn: () => topicApi.getByName(topicName!),
    enabled: !!topicName,
  });

  // Fetch automod rules
  const { data: rules, isLoading: loading, error } = useQuery({
    queryKey: ['automod', topicName],
    queryFn: () => automodApi.getTopicRules(topicName!),
    enabled: !!topicName,
  });

  // Update rule mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => automodApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automod'] });
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to update rule';
      toast.error(errorMessage);
    },
  });

  // Delete rule mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => automodApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automod'] });
      toast.success('Rule deleted');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to delete rule';
      toast.error(errorMessage);
    },
  });

  // Create rule mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => {
      if (!topic?.id) throw new Error('Topic ID not available');
      return automodApi.create({
        ...data,
        topicId: topic.id,
        conditions: [data.conditions],
        actions: [{ type: data.action, value: {} }],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automod'] });
      toast.success('Rule created!');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to create rule';
      toast.error(errorMessage);
    },
  });

  const handleToggle = async (ruleId: string, enabled: boolean) => {
    updateMutation.mutate({ id: ruleId, data: { enabled } });
    toast.success(`Rule ${enabled ? 'enabled' : 'disabled'}`);
  };

  const handleCreate = async (values: any) => {
    await createMutation.mutateAsync(values);
  };

  const handleEdit = (rule: any) => {
    setEditingRule(rule);
    setEditModalVisible(true);
  };

  const handleUpdate = async (values: any) => {
    await updateMutation.mutateAsync({
      id: editingRule.id,
      data: {
        ...values,
        conditions: [values.conditions],
        actions: [{ type: values.action, value: {} }],
      },
    });
  };

  const handleDelete = (ruleId: string) => {
    showConfirmModal({
      title: 'Delete Rule',
      content: 'Are you sure you want to delete this automod rule?',
      okText: 'Delete',
      okType: 'danger',
      onConfirm: async () => {
        deleteMutation.mutate(ruleId);
      },
    });
  };

  const getConditionLabel = (type: string) => {
    const labels: Record<string, string> = {
      keyword: 'Contains Keywords',
      regex: 'Matches Pattern',
      link_count: 'Link Count',
      account_age: 'Account Age',
      karma: 'User Karma',
      domain: 'Domain',
    };
    return labels[type] || type;
  };

  const getActionLabel = (type: string) => {
    const labels: Record<string, string> = {
      remove: 'Remove Content',
      require_approval: 'Require Approval',
      notify_moderators: 'Notify Moderators',
      add_flair: 'Add Flair',
      ban_user: 'Ban User',
    };
    return labels[type] || type;
  };

  const rulesList = rules || [];

  if (loading) {
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
          message="Failed to load automod rules"
          description={(error as any)?.response?.data?.error || (error as Error)?.message || 'An error occurred'}
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['automod'] })}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>
          Automod Rules - t/{topicName}
        </Title>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateModalVisible(true)}
        >
          Create Rule
        </Button>
      </div>

      <Card>
        {rulesList.length === 0 ? (
          <EmptyState description="No automod rules configured">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              Create First Rule
            </Button>
          </EmptyState>
        ) : (
          <List
            dataSource={rulesList.sort((a: any, b: any) => a.priority - b.priority)}
            renderItem={(rule: AutomodRule) => (
              <Card
                size="small"
                style={{ marginBottom: '16px' }}
                title={
                  <Space>
                    <Tag color="blue">Priority {rule.priority}</Tag>
                    <Text strong>{rule.name}</Text>
                    {rule.enabled ? (
                      <Tag color="green">Active</Tag>
                    ) : (
                      <Tag>Disabled</Tag>
                    )}
                  </Space>
                }
                extra={
                  <Space>
                    <Switch
                      checked={rule.enabled}
                      onChange={(checked) => handleToggle(rule.id, checked)}
                    />
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => handleEdit(rule)}
                    />
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDelete(rule.id)}
                    />
                  </Space>
                }
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Paragraph style={{ margin: 0 }}>{rule.description}</Paragraph>

                  <div>
                    <Text strong>Conditions:</Text>
                    <div style={{ marginTop: '8px' }}>
                      {rule.conditions.map((condition: { type: string; value: any }, index: number) => (
                        <Tag key={index} style={{ marginBottom: '4px' }}>
                          {getConditionLabel(condition.type)}
                        </Tag>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Text strong>Actions:</Text>
                    <div style={{ marginTop: '8px' }}>
                      {rule.actions.map((action: { type: string; value: any }, index: number) => (
                        <Tag key={index} color="orange" style={{ marginBottom: '4px' }}>
                          {getActionLabel(action.type)}
                        </Tag>
                      ))}
                    </div>
                  </div>

                  <Text type="secondary">
                    Triggered {rule.triggeredCount} times
                  </Text>
                </Space>
              </Card>
            )}
          />
        )}
      </Card>

      {/* Create Rule Modal */}
      <RuleFormModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSubmit={handleCreate}
      />

      {/* Edit Rule Modal */}
      <RuleFormModal
        visible={editModalVisible}
        onClose={() => {
          setEditModalVisible(false);
          setEditingRule(null);
        }}
        onSubmit={handleUpdate}
        initialValues={editingRule}
        isEdit
      />
    </AppLayout>
  );
};
