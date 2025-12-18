import React, { useState } from 'react';
import { Card, Typography, Form, Input, Button, Space, Divider, Modal } from 'antd';
import { DeleteOutlined, WarningOutlined, EditOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { AppLayout, Avatar, AvatarModal } from '../../components';
import { useAuth } from '../../contexts';
import { userApi } from '../../services/api/user.api';
import { toast } from 'sonner';

const { Title, Text } = Typography;
const { TextArea } = Input;

export const UserSettingsPage: React.FC = () => {
  const { user, logout, refetchUser } = useAuth();
  const navigate = useNavigate();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);

  const handleUpdateProfile = async (values: { displayName: string; bio: string }) => {
    setProfileLoading(true);
    try {
      await userApi.updateProfile({
        displayName: values.displayName,
        bio: values.bio,
      });
      await refetchUser();
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      console.error('Update profile error:', error);
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to update profile';
      toast.error(errorMessage);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdateAvatar = async (style: string, seed: string) => {
    try {
      await userApi.updateAvatar({ avatarStyle: style, avatarSeed: seed });
      await refetchUser();
      toast.success('Avatar updated successfully!');
    } catch (error: any) {
      console.error('Update avatar error:', error);
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to update avatar';
      toast.error(errorMessage);
      throw error;
    }
  };

  const handleChangePassword = async (values: {
    currentPassword: string;
    newPassword: string;
  }) => {
    setPasswordLoading(true);
    try {
      await userApi.updatePassword({
        oldPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      passwordForm.resetFields();
      toast.success('Password changed successfully!');
    } catch (error: any) {
      console.error('Change password error:', error);
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to change password';
      toast.error(errorMessage);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = async (password: string, confirmText: string, confirmed: boolean) => {
    if (confirmText !== user?.username || !confirmed) {
      toast.error('Please confirm account deletion');
      return;
    }

    try {
      await userApi.deleteAccount({
        password,
        confirmText: 'DELETE MY ACCOUNT',
      });
      toast.success('Account deleted successfully');
      await logout();
      navigate('/');
    } catch (error: any) {
      console.error('Delete account error:', error);
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to delete account';
      toast.error(errorMessage);
    }
  };

  return (
    <AppLayout>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <Title level={2}>Account Settings</Title>

        {/* Profile Settings */}
        <Card title={`Profile for u/${user?.username}`} style={{ marginBottom: '24px' }}>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <div>
              <Text strong>Avatar</Text>
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Avatar
                  username={user?.username}
                  avatarStyle={user?.avatarStyle}
                  avatarSeed={user?.avatarSeed}
                  size={80}
                />
                <Button
                  icon={<EditOutlined />}
                  onClick={() => setAvatarModalVisible(true)}
                >
                  Change Avatar
                </Button>
              </div>
              <Text type="secondary" style={{ fontSize: '12px', marginTop: '8px', display: 'block' }}>
                Choose from a variety of avatar styles and designs
              </Text>
            </div>

            <Divider />

            <Form
              form={profileForm}
              layout="vertical"
              onFinish={handleUpdateProfile}
              autoComplete="off"
              initialValues={{
                displayName: user?.displayName || '',
                bio: user?.bio || '',
              }}
            >
              <Form.Item
                name="displayName"
                label="Display Name"
                rules={[{ max: 50, message: 'Display name must be less than 50 characters' }]}
              >
                <Input placeholder="Your display name" maxLength={50} autoComplete="off" />
              </Form.Item>

              <Form.Item
                name="bio"
                label="Bio"
                rules={[{ max: 500, message: 'Bio must be less than 500 characters' }]}
              >
                <TextArea
                  placeholder="Tell us about yourself..."
                  autoSize={{ minRows: 3, maxRows: 6 }}
                  maxLength={500}
                  showCount
                  autoComplete="off"
                />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={profileLoading}>
                  Update Profile
                </Button>
              </Form.Item>
            </Form>
          </Space>
        </Card>

        {/* Password Settings */}
        <Card title="Password" style={{ marginBottom: '24px' }}>
          <Form
            form={passwordForm}
            layout="vertical"
            onFinish={handleChangePassword}
          >
            <Form.Item
              name="currentPassword"
              label="Current Password"
              rules={[{ required: true, message: 'Please enter your current password' }]}
            >
              <Input.Password placeholder="Enter current password" />
            </Form.Item>

            <Form.Item
              name="newPassword"
              label="New Password"
              rules={[
                { required: true, message: 'Please enter a new password' },
                { min: 8, message: 'Password must be at least 8 characters' },
              ]}
            >
              <Input.Password placeholder="Enter new password" />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="Confirm New Password"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: 'Please confirm your new password' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Passwords do not match'));
                  },
                }),
              ]}
            >
              <Input.Password placeholder="Confirm new password" />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={passwordLoading}>
                Change Password
              </Button>
            </Form.Item>
          </Form>
        </Card>

        {/* Danger Zone */}
        <Card
          title={
            <Space>
              <WarningOutlined style={{ color: '#ff4d4f' }} />
              <Text>Danger Zone</Text>
            </Space>
          }
          style={{ marginBottom: '24px', borderColor: '#ff4d4f' }}
        >
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <div>
              <Text strong>Delete Account</Text>
              <br />
              <Text type="secondary">
                Once you delete your account, there is no going back. Please be certain.
              </Text>
            </div>

            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={handleDeleteAccount}
            >
              Delete My Account
            </Button>
          </Space>
        </Card>
      </div>

      <DeleteAccountModal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        onConfirm={handleConfirmDelete}
        username={user?.username || ''}
      />

      <AvatarModal
        visible={avatarModalVisible}
        onClose={() => setAvatarModalVisible(false)}
        onConfirm={handleUpdateAvatar}
        currentStyle={user?.avatarStyle}
        currentSeed={user?.avatarSeed}
      />
    </AppLayout>
  );
};

interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (password: string, confirmText: string, confirmed: boolean) => Promise<void>;
  username: string;
}

const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  visible,
  onClose,
  onConfirm,
  username,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await onConfirm(values.password, values.confirmText, values.confirmed);
      form.resetFields();
      onClose();
    } catch (error: any) {
      if (!error.errorFields) {
        console.error('Delete account error:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <WarningOutlined style={{ color: '#ff4d4f' }} />
          <Text>Delete Account</Text>
        </Space>
      }
      open={visible}
      onOk={handleSubmit}
      onCancel={onClose}
      okText="Delete Account"
      okButtonProps={{ danger: true }}
      confirmLoading={loading}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Text strong style={{ color: '#ff4d4f' }}>
          ⚠️ This action cannot be undone!
        </Text>

        <ul>
          <li>All your posts and comments will be deleted</li>
          <li>Your username will become available for others</li>
          <li>All your saved posts and subscriptions will be lost</li>
          <li>This action is permanent and irreversible</li>
        </ul>

        <Form form={form} layout="vertical" autoComplete="off">
          <Form.Item
            name="password"
            label="Enter your password to confirm"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password placeholder="Password" autoComplete="off" />
          </Form.Item>

          <Form.Item
            name="confirmText"
            label={`Type "${username}" to confirm`}
            rules={[
              { required: true, message: 'Please type your username to confirm' },
              {
                validator: (_, value) =>
                  value === username
                    ? Promise.resolve()
                    : Promise.reject(new Error('Username does not match')),
              },
            ]}
          >
            <Input placeholder={username} autoComplete="off" />
          </Form.Item>

          <Form.Item
            name="confirmed"
            valuePropName="checked"
            rules={[
              {
                validator: (_, value) =>
                  value
                    ? Promise.resolve()
                    : Promise.reject(new Error('Please confirm')),
              },
            ]}
          >
            <label>
              <input type="checkbox" style={{ marginRight: '8px' }} />
              I understand that this action is permanent and cannot be undone
            </label>
          </Form.Item>
        </Form>
      </Space>
    </Modal>
  );
};
