import React from 'react';
import { Card, Typography } from 'antd';
import { AppLayout } from '../../components';

const { Title, Paragraph } = Typography;

export const CommunityRulesPage: React.FC = () => {
  return (
    <AppLayout>
      <Card style={{ textAlign: 'left' }}>
        <style>{`
          .ant-card ul, .ant-card ol {
            padding-left: 40px;
            margin-left: 0;
          }
        `}</style>
        <Title level={1}>Community Guidelines</Title>
        <Paragraph>
          <strong>Last Updated:</strong> November 12, 2025
        </Paragraph>

        <Paragraph>
          Sawwit is a community-driven platform where users can discuss topics they care about.
          These guidelines help ensure Sawwit remains a welcoming and productive space for everyone.
        </Paragraph>

        <Title level={2}>1. Be Respectful</Title>
        <Paragraph>
          Treat others with respect. Disagreement is fine, but personal attacks, harassment,
          and hate speech are not tolerated.
        </Paragraph>

        <Title level={2}>2. No Spam</Title>
        <Paragraph>
          Do not post spam, advertisements, or self-promotion unless explicitly allowed by
          topic rules. Do not manipulate voting or create multiple accounts.
        </Paragraph>

        <Title level={2}>3. Follow Topic Rules</Title>
        <Paragraph>
          Each topic may have its own rules in addition to these site-wide guidelines.
          Familiarize yourself with topic rules before posting.
        </Paragraph>

        <Title level={2}>4. Mark NSFW Content</Title>
        <Paragraph>
          Content that is Not Safe For Work (NSFW) must be marked appropriately. This
          includes sexually explicit, graphic violence, or otherwise sensitive content.
        </Paragraph>

        <Title level={2}>5. No Illegal Content</Title>
        <Paragraph>
          Do not post content that is illegal in your jurisdiction or promotes illegal
          activities. This includes piracy, drugs, weapons sales, and other illegal goods/services.
        </Paragraph>

        <Title level={2}>6. Respect Privacy</Title>
        <Paragraph>
          Do not post personal information (doxxing) about yourself or others. This includes
          addresses, phone numbers, email addresses, and social media accounts.
        </Paragraph>

        <Title level={2}>7. No Manipulation</Title>
        <Paragraph>
          Do not engage in vote manipulation, brigade other communities, or use bots to
          manipulate the platform. Let the community decide what content rises to the top.
        </Paragraph>

        <Title level={2}>8. Original Content</Title>
        <Paragraph>
          Do not plagiarize or claim others' content as your own. Give credit where credit
          is due. Respect intellectual property rights.
        </Paragraph>

        <Title level={2}>9. Constructive Contributions</Title>
        <Paragraph>
          Contribute to discussions constructively. Low-effort comments, trolling, and
          deliberately inflammatory content detract from the community.
        </Paragraph>

        <Title level={2}>10. Report Violations</Title>
        <Paragraph>
          If you see content that violates these guidelines or topic rules, report it to
          the moderators. Do not engage with rule-breakers.
        </Paragraph>

        <Title level={2}>Enforcement</Title>
        <Paragraph>
          Violations of these guidelines may result in:
        </Paragraph>
        <ul>
          <li>Content removal</li>
          <li>Temporary or permanent bans from specific topics</li>
          <li>Site-wide account suspension or termination</li>
        </ul>

        <Paragraph>
          Moderators and administrators have discretion in enforcing these rules. If you
          believe a moderation action was made in error, you may appeal through our contact
          form.
        </Paragraph>

        <Title level={2}>Contact</Title>
        <Paragraph>
          Questions about these guidelines? Contact us at conduct@sawwit.com.
        </Paragraph>
      </Card>
    </AppLayout>
  );
};
