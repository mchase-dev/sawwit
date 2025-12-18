import React from 'react';
import { Layout } from 'antd';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { CookieConsent } from '../Common';

const { Content } = Layout;

interface AppLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  centered?: boolean;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  showSidebar = true,
  centered = true,
}) => {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header />

      <Layout>
        <Content style={{
          padding: '24px',
          maxWidth: centered ? '1200px' : 'none',
          margin: centered ? '0 auto' : '0',
          width: '100%',
        }}>
          <div style={{ display: 'flex', gap: '24px' }}>
            {/* Sidebar */}
            {showSidebar && (
              <div style={{ width: '300px', flexShrink: 0 }}>
                <Sidebar />
              </div>
            )}

            {/* Main Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {children}
            </div>
          </div>
        </Content>
      </Layout>

      <CookieConsent />
    </Layout>
  );
};
