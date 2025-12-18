import React from 'react';
import { Card, Space, Button, Typography, Tag } from 'antd';
import { UserOutlined, FireOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { formatCompactNumber } from '../../utils';

const { Title, Paragraph, Text } = Typography;

interface TopicCardProps {
  topic: {
    name: string;
    description?: string;
    _count?: {
      members: number;
      posts: number;
    };
    isNSFW?: boolean;
    isTrending?: boolean;
    isMember?: boolean;
  };
  onJoin?: () => void;
  onLeave?: () => void;
  showActions?: boolean;
}

export const TopicCard: React.FC<TopicCardProps> = ({
  topic,
  onJoin,
  onLeave,
  showActions = true,
}) => {
  const isMember = topic.isMember || false;

  return (
    <Card
      style={{ marginBottom: '16px' }}
      bodyStyle={{ padding: '20px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            {/* Topic Name */}
            <Space>
              <Link to={`/t/${topic.name}`}>
                <Title level={4} style={{ margin: 0 }}>
                  t/{topic.name}
                </Title>
              </Link>
              {topic.isTrending && (
                <Tag icon={<FireOutlined />} color="red">
                  Trending
                </Tag>
              )}
              {topic.isNSFW && (
                <Tag color="error">NSFW</Tag>
              )}
            </Space>

            {/* Description */}
            {topic.description && (
              <Paragraph
                ellipsis={{ rows: 2 }}
                style={{ margin: 0, color: '#595959' }}
              >
                {topic.description}
              </Paragraph>
            )}

            {/* Stats */}
            <Space size={16}>
              <Space size={4}>
                <UserOutlined style={{ color: '#8c8c8c' }} />
                <Text type="secondary">
                  {formatCompactNumber(topic._count?.members || 0)} members
                </Text>
              </Space>
              {topic._count?.posts !== undefined && (
                <Text type="secondary">
                  {formatCompactNumber(topic._count.posts)} posts
                </Text>
              )}
            </Space>
          </Space>
        </div>

        {/* Join Button */}
        {showActions && (onJoin || onLeave) && (
          <div style={{ marginLeft: '16px' }}>
            {isMember ? (
              <Space direction="vertical" size={4} align="center">
                <Text type="secondary" style={{ fontSize: '12px' }}>Joined</Text>
                <Button danger onClick={onLeave}>
                  Leave
                </Button>
              </Space>
            ) : (
              <Button type="primary" onClick={onJoin}>
                Join
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
