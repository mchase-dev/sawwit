import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Checkbox, Progress } from 'antd';
import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts';
import { AppLayout } from '../../components';
import { getPasswordStrength, isValidUsername } from '../../utils';
import { toast } from 'sonner';
import { UserAgreementModal } from './UserAgreementModal';

const { Title, Text } = Typography;

export const RegisterPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [agreementModalVisible, setAgreementModalVisible] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const passwordStrength = getPasswordStrength(password);

  const getProgressColor = () => {
    switch (passwordStrength.strength) {
      case 'weak':
        return '#ff4d4f';
      case 'medium':
        return '#faad14';
      case 'strong':
        return '#52c41a';
      default:
        return '#d9d9d9';
    }
  };

  const getProgressPercent = () => {
    switch (passwordStrength.strength) {
      case 'weak':
        return 33;
      case 'medium':
        return 66;
      case 'strong':
        return 100;
      default:
        return 0;
    }
  };

  const onFinish = async (values: {
    username: string;
    email: string;
    password: string;
    agreedToTerms: boolean;
  }) => {
    if (!values.agreedToTerms) {
      toast.error('You must agree to the Terms of Service');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await register(values.username, values.email, values.password, values.agreedToTerms);
      toast.success('Account created successfully!');
      navigate('/');
    } catch (err: any) {
      const errorData = err.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || err.message || 'Registration failed. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout showSidebar={false}>
      <div style={{ maxWidth: '400px', margin: '40px auto' }}>
        <Card>
          <Title level={2} style={{ textAlign: 'center', marginBottom: '24px' }}>
            Sign Up for Sawwit
          </Title>

          {error && (
            <Alert
              message="Registration Failed"
              description={error}
              type="error"
              closable
              onClose={() => setError(null)}
              style={{ marginBottom: '16px' }}
            />
          )}

          <Form
            form={form}
            name="register"
            onFinish={onFinish}
            autoComplete="off"
            layout="vertical"
            size="large"
          >
            <Form.Item
              name="username"
              rules={[
                { required: true, message: 'Please enter a username' },
                {
                  validator: (_, value) => {
                    if (!value || isValidUsername(value)) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error('Username must be 3-20 lowercase characters (letters, numbers, underscores). Cannot start or end with underscore.')
                    );
                  },
                },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="username"
                autoComplete="off"
                onChange={(e) => {
                  // Auto-convert to lowercase as user types
                  const value = e.target.value.toLowerCase();
                  form.setFieldValue('username', value);
                }}
              />
            </Form.Item>

            <Form.Item
              name="email"
              rules={[
                { required: true, message: 'Please enter your email' },
                { type: 'email', message: 'Please enter a valid email' },
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="Email"
                autoComplete="off"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: 'Please enter a password' },
                { min: 8, message: 'Password must be at least 8 characters' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Password"
                autoComplete="off"
                onChange={(e) => setPassword(e.target.value)}
              />
            </Form.Item>

            {password && (
              <div style={{ marginBottom: '16px' }}>
                <Progress
                  percent={getProgressPercent()}
                  strokeColor={getProgressColor()}
                  showInfo={false}
                  style={{ marginBottom: '8px' }}
                />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Password strength: <strong>{passwordStrength.strength}</strong>
                </Text>
                {passwordStrength.feedback.length > 0 && (
                  <ul style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '8px', paddingLeft: '20px' }}>
                    {passwordStrength.feedback.map((fb, idx) => (
                      <li key={idx}>{fb}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <Form.Item
              name="confirmPassword"
              dependencies={['password']}
              rules={[
                { required: true, message: 'Please confirm your password' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Passwords do not match'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Confirm Password"
                autoComplete="off"
              />
            </Form.Item>

            <Form.Item
              name="agreedToTerms"
              valuePropName="checked"
              rules={[
                {
                  validator: (_, value) =>
                    value
                      ? Promise.resolve()
                      : Promise.reject(new Error('You must agree to the Terms of Service')),
                },
              ]}
            >
              <Checkbox>
                I agree to the{' '}
                <Button
                  type="link"
                  style={{ padding: 0 }}
                  onClick={(e) => {
                    e.preventDefault();
                    setAgreementModalVisible(true);
                  }}
                >
                  Terms of Service
                </Button>
              </Checkbox>
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                Sign Up
              </Button>
            </Form.Item>

            <div style={{ textAlign: 'center' }}>
              <Text>
                Already have an account? <Link to="/login">Log in</Link>
              </Text>
            </div>
          </Form>
        </Card>
      </div>

      <UserAgreementModal
        visible={agreementModalVisible}
        onClose={() => setAgreementModalVisible(false)}
      />
    </AppLayout>
  );
};
