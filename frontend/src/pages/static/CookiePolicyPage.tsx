import React from 'react';
import { Card, Typography } from 'antd';
import { AppLayout } from '../../components';

const { Title, Paragraph } = Typography;

export const CookiePolicyPage: React.FC = () => {
  return (
    <AppLayout>
      <Card style={{ textAlign: 'left' }}>
        <style>{`
          .ant-card ul, .ant-card ol {
            padding-left: 40px;
            margin-left: 0;
          }
        `}</style>
        <Title level={1}>Cookie Policy</Title>
        <Paragraph>
          <strong>Last Updated:</strong> November 12, 2025
        </Paragraph>

        <Title level={2}>What Are Cookies?</Title>
        <Paragraph>
          Cookies are small text files that are placed on your device when you visit a website.
          They are widely used to make websites work more efficiently and provide information
          to website owners.
        </Paragraph>

        <Title level={2}>How We Use Cookies</Title>
        <Paragraph>
          Sawwit uses cookies to:
        </Paragraph>
        <ul>
          <li>Keep you signed in to your account</li>
          <li>Remember your preferences and settings</li>
          <li>Understand how you use our service</li>
          <li>Improve site performance and security</li>
        </ul>

        <Title level={2}>Types of Cookies We Use</Title>

        <Title level={3}>Essential Cookies</Title>
        <Paragraph>
          These cookies are necessary for the website to function and cannot be disabled.
          They include authentication tokens and session identifiers.
        </Paragraph>

        <Title level={3}>Functional Cookies</Title>
        <Paragraph>
          These cookies enable enhanced functionality and personalization, such as
          remembering your preferences and settings.
        </Paragraph>

        <Title level={3}>Analytics Cookies</Title>
        <Paragraph>
          These cookies help us understand how visitors interact with our website by
          collecting and reporting information anonymously.
        </Paragraph>

        <Title level={2}>Third-Party Cookies</Title>
        <Paragraph>
          We may use third-party services that place cookies on your device, such as:
        </Paragraph>
        <ul>
          <li>Authentication providers (OAuth)</li>
          <li>Analytics services</li>
          <li>Content delivery networks</li>
        </ul>

        <Title level={2}>Managing Cookies</Title>
        <Paragraph>
          You can control and manage cookies through your browser settings. However,
          disabling cookies may affect the functionality of Sawwit.
        </Paragraph>

        <Paragraph>
          Most browsers allow you to:
        </Paragraph>
        <ul>
          <li>View and delete cookies</li>
          <li>Block third-party cookies</li>
          <li>Block cookies from specific sites</li>
          <li>Delete all cookies when closing the browser</li>
        </ul>

        <Title level={2}>Updates to This Policy</Title>
        <Paragraph>
          We may update this Cookie Policy from time to time. We will notify you of any
          changes by posting the new policy on this page.
        </Paragraph>

        <Title level={2}>Contact Us</Title>
        <Paragraph>
          If you have questions about our use of cookies, please contact us at
          privacy@sawwit.com.
        </Paragraph>
      </Card>
    </AppLayout>
  );
};
