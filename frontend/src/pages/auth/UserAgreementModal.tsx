import React from 'react';
import { Modal, Typography } from 'antd';

const { Title, Paragraph } = Typography;

interface UserAgreementModalProps {
  visible: boolean;
  onClose: () => void;
}

export const UserAgreementModal: React.FC<UserAgreementModalProps> = ({
  visible,
  onClose,
}) => {
  return (
    <Modal
      title="Terms of Service"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={700}
      style={{ top: 20 }}
    >
      <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '16px 0' }}>
        <Title level={4}>1. Acceptance of Terms</Title>
        <Paragraph>
          By accessing and using Sawwit, you accept and agree to be bound by the terms
          and provision of this agreement.
        </Paragraph>

        <Title level={4}>2. User Accounts</Title>
        <Paragraph>
          You are responsible for maintaining the confidentiality of your account and
          password. You agree to accept responsibility for all activities that occur
          under your account.
        </Paragraph>

        <Title level={4}>3. Content Guidelines</Title>
        <Paragraph>
          Users must not post content that is illegal, harmful, threatening, abusive,
          harassing, defamatory, vulgar, obscene, or otherwise objectionable. We reserve
          the right to remove any content that violates these guidelines.
        </Paragraph>

        <Title level={4}>4. User Conduct</Title>
        <Paragraph>
          You agree not to:
        </Paragraph>
        <ul>
          <li>Impersonate any person or entity</li>
          <li>Spam or flood the platform</li>
          <li>Harass or threaten other users</li>
          <li>Attempt to gain unauthorized access to the platform</li>
          <li>Distribute malware or harmful code</li>
        </ul>

        <Title level={4}>5. Intellectual Property</Title>
        <Paragraph>
          Users retain ownership of content they post, but grant Sawwit a license to
          display, distribute, and modify the content as necessary to operate the platform.
        </Paragraph>

        <Title level={4}>6. Privacy</Title>
        <Paragraph>
          Your use of Sawwit is also governed by our Privacy Policy. Please review our
          Privacy Policy to understand our practices.
        </Paragraph>

        <Title level={4}>7. Termination</Title>
        <Paragraph>
          We reserve the right to terminate or suspend your account at any time for any
          reason, including violation of these Terms of Service.
        </Paragraph>

        <Title level={4}>8. Disclaimer of Warranties</Title>
        <Paragraph>
          Sawwit is provided "as is" without warranty of any kind, either express or
          implied, including but not limited to warranties of merchantability or fitness
          for a particular purpose.
        </Paragraph>

        <Title level={4}>9. Limitation of Liability</Title>
        <Paragraph>
          In no event shall Sawwit be liable for any indirect, incidental, special,
          consequential or punitive damages arising out of your use of the platform.
        </Paragraph>

        <Title level={4}>10. Changes to Terms</Title>
        <Paragraph>
          We reserve the right to modify these terms at any time. Continued use of the
          platform after changes constitutes acceptance of the modified terms.
        </Paragraph>

        <Paragraph style={{ marginTop: '24px', fontWeight: 'bold' }}>
          Last Updated: November 12, 2025
        </Paragraph>
      </div>
    </Modal>
  );
};
