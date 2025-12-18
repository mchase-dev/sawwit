import React from 'react';
import { Card, Typography } from 'antd';
import { AppLayout } from '../../components';

const { Title, Paragraph } = Typography;

export const PrivacyPage: React.FC = () => {
  return (
    <AppLayout>
      <Card style={{ textAlign: 'left' }}>
        <style>{`
          .ant-card ul, .ant-card ol {
            padding-left: 40px;
            margin-left: 0;
          }
        `}</style>
        <Title level={1}>Privacy Policy</Title>
        <Paragraph>
          <strong>Last Updated:</strong> November 12, 2025
        </Paragraph>

        <Title level={2}>1. Information We Collect</Title>
        <Paragraph>
          We collect information you provide directly to us, including:
        </Paragraph>
        <ul>
          <li>Account information (username, email, password)</li>
          <li>Profile information (display name, bio, avatar)</li>
          <li>Content you post (posts, comments, messages)</li>
          <li>Usage information (voting, saved posts, subscriptions)</li>
        </ul>

        <Title level={2}>2. How We Use Your Information</Title>
        <Paragraph>
          We use the information we collect to:
        </Paragraph>
        <ul>
          <li>Provide, maintain, and improve our services</li>
          <li>Process transactions and send related information</li>
          <li>Send technical notices and support messages</li>
          <li>Respond to your comments and questions</li>
          <li>Monitor and analyze trends and usage</li>
        </ul>

        <Title level={2}>3. Information Sharing</Title>
        <Paragraph>
          We do not sell your personal information. We may share your information in the
          following circumstances:
        </Paragraph>
        <ul>
          <li>With your consent</li>
          <li>To comply with legal obligations</li>
          <li>To protect our rights and prevent fraud</li>
        </ul>

        <Title level={2}>4. Your Rights</Title>
        <Paragraph>
          You have the right to:
        </Paragraph>
        <ul>
          <li>Access your personal information</li>
          <li>Correct inaccurate information</li>
          <li>Delete your account and data</li>
          <li>Export your data</li>
          <li>Opt out of marketing communications</li>
        </ul>

        <Title level={2}>5. Data Security</Title>
        <Paragraph>
          We implement appropriate security measures to protect your personal information.
          However, no method of transmission over the Internet is 100% secure.
        </Paragraph>

        <Title level={2}>6. Cookies</Title>
        <Paragraph>
          We use cookies and similar technologies to provide and improve our services.
          See our Cookie Policy for more information.
        </Paragraph>

        <Title level={2}>7. Changes to This Policy</Title>
        <Paragraph>
          We may update this Privacy Policy from time to time. We will notify you of any
          changes by posting the new policy on this page.
        </Paragraph>

        <Title level={2}>8. Contact Us</Title>
        <Paragraph>
          If you have questions about this Privacy Policy, please contact us at
          privacy@sawwit.com.
        </Paragraph>
      </Card>
    </AppLayout>
  );
};
