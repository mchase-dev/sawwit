import React, { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Switch, Select, Space, Typography } from 'antd';

const { TextArea } = Input;
const { Text } = Typography;

interface RuleFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (values: any) => Promise<void>;
  initialValues?: {
    name: string;
    description: string;
    priority: number;
    enabled: boolean;
    conditions: any;
    action: 'REMOVE' | 'FLAG' | 'REPORT';
  };
  isEdit?: boolean;
}

export const RuleFormModal: React.FC<RuleFormModalProps> = ({
  visible,
  onClose,
  onSubmit,
  initialValues,
  isEdit = false,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible && initialValues) {
      form.setFieldsValue(initialValues);
    } else if (visible) {
      form.resetFields();
    }
  }, [visible, initialValues, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit(values);
      form.resetFields();
      onClose();
    } catch (error) {
      // Form validation error
      console.error('Form validation failed:', error);
    }
  };

  const conditionTypes = [
    { label: 'Contains Keywords', value: 'keyword' },
    { label: 'Matches Pattern (Regex)', value: 'regex' },
    { label: 'Link Count', value: 'link_count' },
    { label: 'Account Age (days)', value: 'account_age' },
    { label: 'User Karma', value: 'karma' },
    { label: 'Domain', value: 'domain' },
  ];

  const actionTypes = [
    { label: 'Remove Content', value: 'REMOVE' },
    { label: 'Flag for Review', value: 'FLAG' },
    { label: 'Create Report', value: 'REPORT' },
  ];

  return (
    <Modal
      title={isEdit ? 'Edit Automod Rule' : 'Create Automod Rule'}
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      width={700}
      okText={isEdit ? 'Update' : 'Create'}
    >
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
        initialValues={{
          enabled: true,
          priority: 100,
          conditions: {},
          action: 'REMOVE',
        }}
      >
        <Form.Item
          name="name"
          label="Rule Name"
          rules={[
            { required: true, message: 'Please enter a rule name' },
            { min: 3, message: 'Rule name must be at least 3 characters' },
          ]}
        >
          <Input placeholder="e.g., Block spam links" autoComplete="off" />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description"
          extra="Optional description of what this rule does"
        >
          <TextArea
            rows={2}
            placeholder="Describe when this rule should trigger and what it does"
            autoComplete="off"
          />
        </Form.Item>

        <Space style={{ width: '100%' }} size="large">
          <Form.Item
            name="priority"
            label="Priority"
            tooltip="Lower numbers run first (1-1000)"
            rules={[{ required: true, message: 'Please enter priority' }]}
          >
            <InputNumber min={1} max={1000} placeholder="100" />
          </Form.Item>

          <Form.Item
            name="enabled"
            label="Enabled"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Space>

        <Form.Item label="Conditions">
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            Configure conditions that trigger this rule. Basic condition support only.
          </Text>

          <Form.Item
            name={['conditions', 'type']}
            label="Condition Type"
            rules={[{ required: true, message: 'Please select a condition type' }]}
          >
            <Select placeholder="Select condition type" options={conditionTypes} />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.conditions?.type !== currentValues.conditions?.type
            }
          >
            {({ getFieldValue }) => {
              const conditionType = getFieldValue(['conditions', 'type']);

              if (conditionType === 'keyword') {
                return (
                  <Form.Item
                    name={['conditions', 'keywords']}
                    label="Keywords (comma-separated)"
                    rules={[{ required: true, message: 'Please enter keywords' }]}
                  >
                    <Input placeholder="spam, scam, banned-word" autoComplete="off" />
                  </Form.Item>
                );
              }

              if (conditionType === 'regex') {
                return (
                  <Form.Item
                    name={['conditions', 'pattern']}
                    label="Regular Expression"
                    rules={[{ required: true, message: 'Please enter a regex pattern' }]}
                  >
                    <Input placeholder="^\[.*\].*$" autoComplete="off" />
                  </Form.Item>
                );
              }

              if (conditionType === 'link_count') {
                return (
                  <Form.Item
                    name={['conditions', 'maxLinks']}
                    label="Maximum Links Allowed"
                    rules={[{ required: true, message: 'Please enter max links' }]}
                  >
                    <InputNumber min={0} max={100} placeholder="3" />
                  </Form.Item>
                );
              }

              if (conditionType === 'account_age') {
                return (
                  <Form.Item
                    name={['conditions', 'minAgeDays']}
                    label="Minimum Account Age (days)"
                    rules={[{ required: true, message: 'Please enter minimum age' }]}
                  >
                    <InputNumber min={0} max={3650} placeholder="30" />
                  </Form.Item>
                );
              }

              if (conditionType === 'karma') {
                return (
                  <Form.Item
                    name={['conditions', 'minKarma']}
                    label="Minimum Karma Required"
                    rules={[{ required: true, message: 'Please enter minimum karma' }]}
                  >
                    <InputNumber min={-1000} max={100000} placeholder="10" />
                  </Form.Item>
                );
              }

              if (conditionType === 'domain') {
                return (
                  <Form.Item
                    name={['conditions', 'domains']}
                    label="Blocked Domains (comma-separated)"
                    rules={[{ required: true, message: 'Please enter domains' }]}
                  >
                    <Input placeholder="spam.com, scam.net" autoComplete="off" />
                  </Form.Item>
                );
              }

              return null;
            }}
          </Form.Item>
        </Form.Item>

        <Form.Item
          name="action"
          label="Action"
          rules={[{ required: true, message: 'Please select an action' }]}
          tooltip="What should happen when this rule is triggered"
        >
          <Select placeholder="Select action" options={actionTypes} />
        </Form.Item>
      </Form>
    </Modal>
  );
};
