import React from 'react';
import { Empty } from 'antd';

interface EmptyStateProps {
  description?: string;
  image?: React.ReactNode;
  children?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  description = 'No data',
  image,
  children,
}) => {
  return (
    <div style={{ padding: '40px 20px', textAlign: 'center' }}>
      <Empty image={image} description={description}>
        {children}
      </Empty>
    </div>
  );
};
