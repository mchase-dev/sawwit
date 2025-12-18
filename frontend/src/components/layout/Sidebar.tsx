import React from 'react';
import { Card, List, Button, Space, Divider, Tag } from 'antd';
import { Link } from 'react-router-dom';
import { FireOutlined, TeamOutlined, CrownOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts';
import { trendingApi } from '../../services/api/trending.api';
import { topicApi } from '../../services/api/topic.api';
import { formatCompactNumber } from '../../utils';

export const Sidebar: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  // Fetch user's topic memberships
  const { data: myTopics } = useQuery({
    queryKey: ['topics', 'memberships'],
    queryFn: () => topicApi.getUserMemberships(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch trending topics
  const { data: trendingTopics } = useQuery({
    queryKey: ['trending', 'topics'],
    queryFn: () => trendingApi.getTopics(5),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return (
    <div style={{ position: 'sticky', top: '80px' }}>
      {/* My Topics */}
      {isAuthenticated && myTopics && myTopics.length > 0 && (
        <Card
          title={
            <Space>
              <TeamOutlined />
              <span>My Topics</span>
            </Space>
          }
          style={{ marginBottom: '16px' }}
        >
          <List
            size="small"
            dataSource={myTopics}
            renderItem={(topic: any) => {
              const isOwner = topic.ownerId === user?.id;
              const isModerator = topic.role === 'MODERATOR';
              const memberCount = topic._count?.members || 0;

              return (
                <List.Item
                  style={{ padding: '8px 0', border: 'none' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Link to={`/t/${topic.name}`} style={{ fontWeight: 500 }}>
                        t/{topic.name}
                      </Link>
                      {isOwner ? (
                        <Tag color="gold" style={{ margin: 0, fontSize: '10px', padding: '0 4px' }}>
                          <CrownOutlined style={{ fontSize: '9px' }} /> Owner
                        </Tag>
                      ) : isModerator ? (
                        <Tag color="blue" style={{ margin: 0, fontSize: '10px', padding: '0 4px' }}>
                          <CrownOutlined style={{ fontSize: '9px' }} /> Mod
                        </Tag>
                      ) : null}
                    </div>
                    <span style={{ fontSize: '11px', color: '#8c8c8c', whiteSpace: 'nowrap' }}>
                      {formatCompactNumber(memberCount)} {memberCount === 1 ? 'member' : 'members'}
                    </span>
                  </div>
                </List.Item>
              );
            }}
          />
          <Divider style={{ margin: '12px 0' }} />
          <Link to="/topics">
            <Button type="link" size="small" block>
              Browse All Topics
            </Button>
          </Link>
        </Card>
      )}

      {/* Trending Topics */}
      <Card
        title={
          <Space>
            <FireOutlined style={{ color: '#ff4500' }} />
            <span>Trending Topics</span>
          </Space>
        }
        style={{ marginBottom: '16px' }}
      >
        {trendingTopics && trendingTopics.length > 0 ? (
          <>
            <List
              size="small"
              dataSource={trendingTopics}
              renderItem={(topic: any) => {
                const memberCount = topic.memberCount || 0;
                return (
                  <List.Item
                    style={{ padding: '8px 0', border: 'none' }}
                    extra={
                      <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
                        {formatCompactNumber(memberCount)} {memberCount === 1 ? 'member' : 'members'}
                      </span>
                    }
                  >
                    <Link to={`/t/${topic.name}`} style={{ fontWeight: 500 }}>
                      t/{topic.name}
                    </Link>
                  </List.Item>
                );
              }}
            />
            <Divider style={{ margin: '12px 0' }} />
          </>
        ) : (
          <div style={{ padding: '16px 0', textAlign: 'center', color: '#8c8c8c' }}>
            No trending topics yet
          </div>
        )}
        <Link to="/topics">
          <Button type="link" size="small" block>
            View All Topics
          </Button>
        </Link>
      </Card>

      {/* Footer Links */}
      <Card size="small">
        <Space direction="vertical" size="small" style={{ width: '100%', fontSize: '12px' }}>
          <Link to="/privacy" style={{ color: '#595959' }}>
            Privacy Policy
          </Link>
          <Link to="/terms" style={{ color: '#595959' }}>
            Terms of Service
          </Link>
          <Link to="/cookie-policy" style={{ color: '#595959' }}>
            Cookie Policy
          </Link>
          <Link to="/community-rules" style={{ color: '#595959' }}>
            Community Rules
          </Link>
          <Link to="/contact" style={{ color: '#595959' }}>
            Contact Us
          </Link>
          <Divider style={{ margin: '8px 0' }} />
          <span style={{ color: '#8c8c8c' }}>© 2025 Sawwit</span>
        </Space>
      </Card>
    </div>
  );
};
