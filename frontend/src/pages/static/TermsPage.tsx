import React from 'react';
import { Card, Typography } from 'antd';
import { AppLayout } from '../../components';

const { Title, Paragraph } = Typography;

export const TermsPage: React.FC = () => {
  return (
    <AppLayout>
      <Card style={{ textAlign: 'left' }}>
        <style>{`
          .ant-card ul, .ant-card ol {
            padding-left: 40px;
            margin-left: 0;
          }
        `}</style>
        <Title level={1}>Terms of Service</Title>
        <Paragraph>
          <strong>Last Updated:</strong> November 12, 2025
        </Paragraph>

        <Title level={2}>1. Acceptance of Terms</Title>
        <Paragraph>
          By accessing and using Sawwit ("the Service"), you accept and agree to be bound by the
          terms and provision of this agreement. If you do not agree to abide by the above, please
          do not use this service.
        </Paragraph>

        <Title level={2}>2. User Accounts</Title>
        <Paragraph>
          You are responsible for maintaining the confidentiality of your account and password.
          You agree to accept responsibility for all activities that occur under your account.
          You must notify us immediately of any unauthorized use of your account.
        </Paragraph>

        <Title level={2}>3. Content Guidelines</Title>
        <Paragraph>
          Users must not post content that is:
        </Paragraph>
        <ul>
          <li>Illegal, harmful, threatening, abusive, harassing, or defamatory</li>
          <li>Vulgar, obscene, or sexually explicit</li>
          <li>Invasive of another's privacy</li>
          <li>Hateful or racially/ethnically offensive</li>
          <li>Spam or unsolicited commercial content</li>
          <li>Infringing on intellectual property rights</li>
        </ul>

        <Title level={2}>4. User Conduct</Title>
        <Paragraph>
          You agree not to:
        </Paragraph>
        <ul>
          <li>Impersonate any person or entity</li>
          <li>Manipulate voting or engagement metrics</li>
          <li>Create multiple accounts to evade bans</li>
          <li>Harass, threaten, or doxx other users</li>
          <li>Attempt to gain unauthorized access</li>
          <li>Distribute malware or harmful code</li>
          <li>Scrape or harvest user data</li>
        </ul>

        <Title level={2}>5. Intellectual Property</Title>
        <Paragraph>
          Users retain ownership of content they post, but grant Sawwit a non-exclusive,
          royalty-free, worldwide license to use, display, reproduce, and distribute the
          content as necessary to operate the Service.
        </Paragraph>

        <Title level={2}>6. Moderation</Title>
        <Paragraph>
          Topic moderators and administrators have the right to remove content and ban users
          who violate these terms or community guidelines. Moderation decisions are final.
        </Paragraph>

        <Title level={2}>7. Privacy</Title>
        <Paragraph>
          Your use of Sawwit is also governed by our Privacy Policy. Please review our
          Privacy Policy to understand our practices.
        </Paragraph>

        <Title level={2}>8. Termination</Title>
        <Paragraph>
          We reserve the right to terminate or suspend your account at any time for any
          reason, including violation of these Terms of Service. You may delete your account
          at any time from your account settings.
        </Paragraph>

        <Title level={2}>9. Disclaimer of Warranties</Title>
        <Paragraph>
          Sawwit is provided "as is" without warranty of any kind, either express or
          implied, including but not limited to warranties of merchantability, fitness
          for a particular purpose, or non-infringement.
        </Paragraph>

        <Title level={2}>10. Limitation of Liability</Title>
        <Paragraph>
          In no event shall Sawwit or its operators be liable for any indirect, incidental,
          special, consequential, or punitive damages arising out of your use of the Service.
        </Paragraph>

        <Title level={2}>11. Changes to Terms</Title>
        <Paragraph>
          We reserve the right to modify these terms at any time. Continued use of the
          Service after changes constitutes acceptance of the modified terms.
        </Paragraph>

        <Title level={2}>12. Governing Law</Title>
        <Paragraph>
          These Terms shall be governed by and construed in accordance with applicable laws.
        </Paragraph>

        <Title level={2}>13. Contact</Title>
        <Paragraph>
          If you have questions about these Terms of Service, please contact us at
          legal@sawwit.com.
        </Paragraph>
      </Card>
    </AppLayout>
  );
};
