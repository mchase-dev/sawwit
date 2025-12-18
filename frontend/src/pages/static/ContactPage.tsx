import React, { useState } from 'react';
import { Card, Typography, Form, Input, Button, Select } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { AppLayout } from '../../components';
import { toast } from 'sonner';

const { Title, Paragraph } = Typography;
const { TextArea } = Input;

export const ContactPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }) => {
    setLoading(true);
    try {
      console.log('Submit contact form:', values);
      // TODO: Implement with API call
      toast.success('Message sent successfully! We\'ll get back to you soon.');
      form.resetFields();
    } catch (error) {
      console.error('Contact form error:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <Card style={{ textAlign: 'left' }}>
        <style>{`
          .ant-card ul, .ant-card ol {
            padding-left: 40px;
            margin-left: 0;
          }
        `}</style>
        <Title level={1}>Contact Us</Title>
          <Paragraph>
            Have a question, suggestion, or issue? We'd love to hear from you!
          </Paragraph>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            autoComplete="off"
          >
            <Form.Item
              name="name"
              label="Name"
              rules={[{ required: true, message: 'Please enter your name' }]}
            >
              <Input placeholder="Your name" autoComplete="off" />
            </Form.Item>

            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Please enter your email' },
                { type: 'email', message: 'Please enter a valid email' },
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="your.email@example.com"
                autoComplete="off"
              />
            </Form.Item>

            <Form.Item
              name="subject"
              label="Subject"
              rules={[{ required: true, message: 'Please select a subject' }]}
            >
              <Select
                placeholder="Select a subject"
                options={[
                  { label: 'General Inquiry', value: 'general' },
                  { label: 'Bug Report', value: 'bug' },
                  { label: 'Feature Request', value: 'feature' },
                  { label: 'Account Issue', value: 'account' },
                  { label: 'Content Report', value: 'content' },
                  { label: 'Partnership', value: 'partnership' },
                  { label: 'Other', value: 'other' },
                ]}
              />
            </Form.Item>

            <Form.Item
              name="message"
              label="Message"
              rules={[
                { required: true, message: 'Please enter your message' },
                { max: 2000, message: 'Message must be less than 2000 characters' },
              ]}
            >
              <TextArea
                placeholder="Tell us more about your inquiry..."
                autoSize={{ minRows: 6, maxRows: 12 }}
                maxLength={2000}
                showCount
                autoComplete="off"
              />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block size="large">
                Send Message
              </Button>
            </Form.Item>
          </Form>

          <Paragraph style={{ marginTop: '24px' }}>
            <strong>Other ways to reach us:</strong>
          </Paragraph>
          <ul>
            <li>General inquiries: contact@sawwit.com</li>
            <li>Legal matters: legal@sawwit.com</li>
            <li>Privacy concerns: privacy@sawwit.com</li>
            <li>Community conduct: conduct@sawwit.com</li>
          </ul>
        </Card>
    </AppLayout>
  );
};
