import React from 'react';
import { Card, Typography, Row, Col, Statistic, List, Space, Alert } from 'antd';
import {
  UserOutlined,
  FileTextOutlined,
  CommentOutlined,
  FlagOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppLayout, LoadingSpinner, ErrorMessage } from '../../components';
import { formatCompactNumber } from '../../utils';
import { adminApi } from '../../services/api/admin.api';

const { Title, Text } = Typography;

export const AdminDashboardPage: React.FC = () => {
  // Fetch admin statistics
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi.getStats(),
  });

  // Fetch recent activity
  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ['admin', 'activity'],
    queryFn: () => adminApi.getRecentActivity(),
  });

  const loading = statsLoading || activityLoading;
  const activityList = recentActivity || [];

  if (loading) {
    return (
      <AppLayout>
        <LoadingSpinner />
      </AppLayout>
    );
  }

  if (statsError) {
    return (
      <AppLayout>
        <ErrorMessage
          message="Failed to load admin dashboard"
          description={(statsError as any)?.response?.data?.error || (statsError as Error)?.message || 'An error occurred'}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Title level={2}>Admin Dashboard</Title>

      <Alert
        message="Limited Statistics Available"
        description="Some statistics are currently unavailable and will be added when the backend admin endpoints are implemented."
        type="info"
        showIcon
        closable
        style={{ marginBottom: '24px' }}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Total Users"
              value={stats?.totalUsers || 0}
              prefix={<UserOutlined />}
              formatter={(value) => formatCompactNumber(Number(value))}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Total Posts"
              value={stats?.totalPosts || 0}
              prefix={<FileTextOutlined />}
              formatter={(value) => formatCompactNumber(Number(value))}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Total Comments"
              value={stats?.totalComments || 0}
              prefix={<CommentOutlined />}
              formatter={(value) => formatCompactNumber(Number(value))}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Link to="/admin/reports">
              <Statistic
                title="Pending Reports"
                value={stats?.pendingReports || 0}
                prefix={<FlagOutlined />}
                valueStyle={{ color: (stats?.pendingReports || 0) > 0 ? '#ff4d4f' : undefined }}
              />
            </Link>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Active Moderators"
              value={stats?.activeModerators || 0}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Recent Activity">
            {activityList.length === 0 ? (
              <Text type="secondary">No recent activity available</Text>
            ) : (
              <List
                dataSource={activityList}
                renderItem={(item: any) => (
                  <List.Item>
                    <Space direction="vertical" size={0}>
                      <Text strong>
                        {item.type === 'user_registered' && 'New user registered'}
                        {item.type === 'post_created' && 'New post created'}
                        {item.type === 'report_submitted' && 'New report submitted'}
                      </Text>
                      <Text type="secondary">
                        by u/{item.user}
                        {item.topic && ` in t/${item.topic}`} • {item.time}
                      </Text>
                    </Space>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Quick Actions">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Link to="/admin/reports">
                <Card size="small" hoverable>
                  <Space>
                    <FlagOutlined />
                    <Text>Review Reports Queue</Text>
                  </Space>
                </Card>
              </Link>
              <Link to="/admin/modlog">
                <Card size="small" hoverable>
                  <Space>
                    <FileTextOutlined />
                    <Text>View Global Mod Log</Text>
                  </Space>
                </Card>
              </Link>
            </Space>
          </Card>
        </Col>
      </Row>
    </AppLayout>
  );
};
