import { Modal } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

interface ConfirmModalProps {
  title: string;
  content: string;
  okText?: string;
  cancelText?: string;
  okType?: 'primary' | 'danger' | 'default';
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

export const showConfirmModal = ({
  title,
  content,
  okText = 'Confirm',
  cancelText = 'Cancel',
  okType = 'primary',
  onConfirm,
  onCancel,
}: ConfirmModalProps) => {
  Modal.confirm({
    title,
    icon: <ExclamationCircleOutlined />,
    content,
    okText,
    cancelText,
    okType,
    onOk: async () => {
      await onConfirm();
    },
    onCancel,
  });
};
