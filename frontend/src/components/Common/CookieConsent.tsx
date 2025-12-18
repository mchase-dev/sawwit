import React, { useState, useEffect } from 'react';
import { Button } from 'antd';

export const CookieConsent: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setVisible(false);
  };

  if (!visible) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#001529',
        color: 'white',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 1000,
        boxShadow: '0 -2px 8px rgba(0,0,0,0.15)',
      }}
    >
      <div style={{ flex: 1, marginRight: '20px' }}>
        <p style={{ margin: 0 }}>
          We use cookies to improve your experience on our site. By using Sawwit, you agree to our{' '}
          <a href="/cookie-policy" style={{ color: '#1890ff', textDecoration: 'underline' }}>
            Cookie Policy
          </a>
          .
        </p>
      </div>
      <Button type="primary" onClick={handleAccept}>
        Accept
      </Button>
    </div>
  );
};
