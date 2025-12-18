import React, { useState } from 'react';
import { Modal, Form, Select, Input } from 'antd';
import { toast } from 'sonner';
import { reportApi } from '../../services/api/report.api';

const { TextArea } = Input;

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  targetType: 'post' | 'comment' | 'user';
  targetId: string;
}

const REPORT_REASONS = {
  post: [
    { value: 'spam', label: 'Spam or advertising' },
    { value: 'harassment', label: 'Harassment or bullying' },
    { value: 'hate_speech', label: 'Hate speech' },
    { value: 'violence', label: 'Violence or threats' },
    { value: 'nsfw', label: 'Unmarked NSFW content' },
    { value: 'misinformation', label: 'Misinformation' },
    { value: 'illegal', label: 'Illegal content' },
    { value: 'other', label: 'Other' },
  ],
  comment: [
    { value: 'spam', label: 'Spam' },
    { value: 'harassment', label: 'Harassment or bullying' },
    { value: 'hate_speech', label: 'Hate speech' },
    { value: 'violence', label: 'Violence or threats' },
    { value: 'other', label: 'Other' },
  ],
  user: [
    { value: 'spam', label: 'Spam account' },
    { value: 'harassment', label: 'Harassment' },
    { value: 'impersonation', label: 'Impersonation' },
    { value: 'inappropriate_username', label: 'Inappropriate username' },
    { value: 'other', label: 'Other' },
  ],
};

export const ReportModal: React.FC<ReportModalProps> = ({
  visible,
  onClose,
  targetType,
  targetId,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // User reports are not supported by the backend yet
      if (targetType === 'user') {
        toast.error('User reports are not yet supported');
        return;
      }

      await reportApi.create({
        targetType: targetType.toUpperCase() as 'POST' | 'COMMENT' | 'USER',
        targetId,
        reason: values.reason,
      });

      toast.success('Report submitted successfully');
      form.resetFields();
      onClose();
    } catch (error: any) {
      if (!error.errorFields) {
        console.error('Report submission error:', error);
        const errorMessage = error.response?.data?.error?.message || 'Failed to submit report';
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`Report ${targetType}`}
      open={visible}
      onOk={handleSubmit}
      onCancel={onClose}
      okText="Submit Report"
      confirmLoading={loading}
    >
      <Form form={form} layout="vertical" autoComplete="off">
        <Form.Item
          name="reason"
          label="Reason"
          rules={[{ required: true, message: 'Please select a reason' }]}
        >
          <Select
            placeholder="Select a reason"
            options={REPORT_REASONS[targetType]}
          />
        </Form.Item>

        <Form.Item
          name="description"
          label="Additional Details (optional)"
          rules={[{ max: 500, message: 'Description must be less than 500 characters' }]}
        >
          <TextArea
            placeholder="Provide additional context about this report..."
            autoSize={{ minRows: 3, maxRows: 6 }}
            maxLength={500}
            showCount
            autoComplete="off"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
