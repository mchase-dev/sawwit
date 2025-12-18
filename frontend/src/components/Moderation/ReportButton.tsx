import React, { useState } from 'react';
import { Button, ButtonProps } from 'antd';
import { FlagOutlined } from '@ant-design/icons';
import { ReportModal } from './ReportModal';

interface ReportButtonProps {
  targetType: 'post' | 'comment' | 'user';
  targetId: string;
  size?: ButtonProps['size'];
}

export const ReportButton: React.FC<ReportButtonProps> = ({
  targetType,
  targetId,
  size = 'small',
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      <Button
        type="text"
        size={size}
        icon={<FlagOutlined />}
        onClick={() => setModalVisible(true)}
      >
        Report
      </Button>

      <ReportModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        targetType={targetType}
        targetId={targetId}
      />
    </>
  );
};
