import React, { useState } from 'react';
import { Input, Button, Space } from 'antd';
import { SendOutlined } from '@ant-design/icons';

const { TextArea } = Input;

interface CommentFormProps {
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
  initialValue?: string;
  placeholder?: string;
  submitText?: string;
  autoFocus?: boolean;
}

export const CommentForm: React.FC<CommentFormProps> = ({
  onSubmit,
  onCancel,
  initialValue = '',
  placeholder = 'What are your thoughts?',
  submitText = 'Comment',
  autoFocus = false,
}) => {
  const [content, setContent] = useState(initialValue);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit(content.trim());
      setContent('');
    } catch (error) {
      console.error('Comment submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <TextArea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoSize={{ minRows: 3, maxRows: 10 }}
        autoFocus={autoFocus}
        style={{ marginBottom: '8px' }}
        autoComplete="off"
      />

      <Space>
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSubmit}
          loading={loading}
          disabled={!content.trim()}
        >
          {submitText}
        </Button>

        {onCancel && (
          <Button onClick={onCancel}>
            Cancel
          </Button>
        )}

        <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
          Ctrl+Enter to submit
        </span>
      </Space>
    </div>
  );
};
