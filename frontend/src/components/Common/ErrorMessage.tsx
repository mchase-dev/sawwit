import React from 'react';
import { Alert, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

interface ErrorMessageProps {
  message?: string;
  description?: string;
  onRetry?: () => void;
  showRetry?: boolean;
  type?: 'error' | 'warning' | 'info';
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message = 'Something went wrong',
  description,
  onRetry,
  showRetry = true,
  type = 'error',
}) => {
  return (
    <div style={{ padding: '20px' }}>
      <Alert
        message={message}
        description={description}
        type={type}
        showIcon
        action={
          showRetry && onRetry ? (
            <Button size="small" icon={<ReloadOutlined />} onClick={onRetry}>
              Retry
            </Button>
          ) : undefined
        }
      />
    </div>
  );
};
