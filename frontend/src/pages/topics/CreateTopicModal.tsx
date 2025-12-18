import React, { useState } from 'react';
import { Modal, Form, Input, Checkbox, Alert } from 'antd';
import { toast } from 'sonner';

const { TextArea } = Input;

interface CreateTopicModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { displayName: string; description: string; isNSFW: boolean }) => Promise<void>;
}

export const CreateTopicModal: React.FC<CreateTopicModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      await onSubmit({
        displayName: values.name,
        description: values.description || '',
        isNSFW: values.isNSFW || false,
      });

      form.resetFields();
      onClose();
    } catch (error: any) {
      if (error.errorFields) {
        // Form validation error
        return;
      }
      console.error('Create topic error:', error);

      // Safely extract error message as string
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to create topic';

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="Create a New Topic"
      open={visible}
      onOk={handleSubmit}
      onCancel={handleCancel}
      okText="Create Topic"
      confirmLoading={loading}
      width={600}
    >
      <Alert
        message="Topic Guidelines"
        description="Choose a descriptive name for your topic. A URL-friendly name will be automatically generated. Choose wisely - topic names cannot be changed!"
        type="info"
        showIcon
        style={{ marginBottom: '16px' }}
      />

      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item
          name="name"
          label="Topic Name"
          rules={[
            { required: true, message: 'Please enter a topic name' },
            { min: 3, message: 'Topic name must be at least 3 characters' },
            { max: 50, message: 'Topic name must be less than 50 characters' },
          ]}
        >
          <Input
            placeholder="e.g., Technology, Gaming, Cooking"
            maxLength={50}
            autoComplete="off"
          />
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
            placeholder="What is this topic about?"
            autoSize={{ minRows: 3, maxRows: 6 }}
            maxLength={500}
            showCount
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item
          name="isNSFW"
          valuePropName="checked"
        >
          <Checkbox>
            This topic contains NSFW (Not Safe For Work) content
          </Checkbox>
        </Form.Item>
      </Form>
    </Modal>
  );
};
