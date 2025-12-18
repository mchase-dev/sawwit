import React, { useState } from 'react';
import { Card, Typography, List, Space, Button, Tag, Tabs } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout, LoadingSpinner, ErrorMessage, EmptyState } from '../../components';
import { formatRelativeTime } from '../../utils';
import { reportApi } from '../../services/api/report.api';
import { toast } from 'sonner';

const { Title, Text, Paragraph } = Typography;

interface Report {
  id: string;
  reason: string;
  description?: string;
  status: 'pending' | 'resolved' | 'dismissed';
  targetType: 'post' | 'comment' | 'user';
  target: {
    id: string;
    content?: string;
    title?: string;
    username?: string;
  };
  reporter: {
    username: string;
  };
  createdAt: string;
}

export const ModQueuePage: React.FC = () => {
  const [filter, setFilter] = useState<'pending' | 'resolved' | 'dismissed' | 'all'>('pending');
  const queryClient = useQueryClient();

  // Fetch reports
  const { data, isLoading: loading, error } = useQuery({
    queryKey: ['reports', filter],
    queryFn: () => reportApi.getAll(undefined, filter === 'all' ? undefined : filter, 1, 50),
  });

  // Resolve report mutation
  const resolveMutation = useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution: string }) =>
      reportApi.resolve(id, resolution),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Report resolved');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to resolve report';
      toast.error(errorMessage);
    },
  });

  // Dismiss report mutation
  const dismissMutation = useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution: string }) =>
      reportApi.dismiss(id, resolution),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Report dismissed');
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to dismiss report';
      toast.error(errorMessage);
    },
  });

  const reports = data?.data || [];
  const filteredReports = reports;

  const handleResolve = async (reportId: string, resolution: string) => {
    resolveMutation.mutate({ id: reportId, resolution });
  };

  const handleDismiss = async (reportId: string, resolution: string) => {
    dismissMutation.mutate({ id: reportId, resolution });
  };

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      spam: 'Spam',
      harassment: 'Harassment',
      hate_speech: 'Hate Speech',
      violence: 'Violence',
      nsfw: 'NSFW',
      misinformation: 'Misinformation',
      illegal: 'Illegal Content',
      impersonation: 'Impersonation',
      inappropriate_username: 'Inappropriate Username',
      other: 'Other',
    };
    return labels[reason] || reason;
  };

  const getStatusColor = (status: Report['status']) => {
    switch (status) {
      case 'pending':
        return 'gold';
      case 'resolved':
        return 'green';
      case 'dismissed':
        return 'red';
      default:
        return 'default';
    }
  };

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
          message="Failed to load reports"
          description={(error as any)?.response?.data?.error || (error as Error)?.message || 'An error occurred'}
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['reports'] })}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Title level={2}>Moderation Queue</Title>

      <Card>
        <Tabs
          activeKey={filter}
          onChange={(key) => setFilter(key as any)}
          items={[
            {
              key: 'pending',
              label: `Pending (${reports.filter((r: Report) => r.status === 'pending').length})`,
            },
            {
              key: 'resolved',
              label: `Resolved (${reports.filter((r: Report) => r.status === 'resolved').length})`,
            },
            {
              key: 'dismissed',
              label: `Dismissed (${reports.filter((r: Report) => r.status === 'dismissed').length})`,
            },
            {
              key: 'all',
              label: `All (${reports.length})`,
            },
          ]}
        />

        {filteredReports.length === 0 ? (
          <EmptyState description={`No ${filter === 'all' ? '' : filter} reports`} />
        ) : (
          <List
            dataSource={filteredReports}
            renderItem={(report: Report) => (
              <Card
                size="small"
                style={{ marginBottom: '16px' }}
                title={
                  <Space>
                    <Tag color={getStatusColor(report.status)}>
                      {report.status.toUpperCase()}
                    </Tag>
                    <Tag>{getReasonLabel(report.reason)}</Tag>
                    <Tag color="blue">{report.targetType}</Tag>
                  </Space>
                }
                extra={
                  report.status === 'pending' && (
                    <Space>
                      <Button
                        type="primary"
                        size="small"
                        icon={<CheckOutlined />}
                        onClick={() => handleResolve(report.id, 'Content removed')}
                      >
                        Resolve
                      </Button>
                      <Button
                        size="small"
                        icon={<CloseOutlined />}
                        onClick={() => handleDismiss(report.id, 'No violation found')}
                      >
                        Dismiss
                      </Button>
                    </Space>
                  )
                }
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Text type="secondary">Reported by: </Text>
                    <Link to={`/u/${report.reporter.username}`}>
                      <Text strong>u/{report.reporter.username}</Text>
                    </Link>
                    <Text type="secondary"> • {formatRelativeTime(report.createdAt)}</Text>
                  </div>

                  {report.description && (
                    <Paragraph style={{ margin: 0 }}>
                      <Text type="secondary">Details: </Text>
                      {report.description}
                    </Paragraph>
                  )}

                  <Card size="small" style={{ backgroundColor: '#fafafa' }}>
                    <Text strong>Reported Content:</Text>
                    <Paragraph style={{ margin: '8px 0 0 0' }}>
                      {report.target.title || report.target.content || report.target.username}
                    </Paragraph>
                  </Card>
                </Space>
              </Card>
            )}
          />
        )}
      </Card>
    </AppLayout>
  );
};
