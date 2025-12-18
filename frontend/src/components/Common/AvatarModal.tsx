import React, { useState, useEffect } from 'react';
import { Modal, Select, Button, Space, Typography, Spin } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

const { Text } = Typography;

// Available Dicebear avatar styles
const AVATAR_STYLES = [
  { value: 'bottts', label: 'Robots' },
  { value: 'avataaars', label: 'Cartoon People' },
  { value: 'identicon', label: 'Geometric' },
  { value: 'lorelei', label: 'Illustrated Faces' },
  { value: 'notionists', label: 'Notion Style' },
  { value: 'open-peeps', label: 'Line Art' },
  { value: 'personas', label: 'Personas' },
  { value: 'pixel-art', label: 'Pixel Art' },
  { value: 'thumbs', label: 'Thumbs' },
  { value: 'fun-emoji', label: 'Fun Emoji' },
  { value: 'adventurer', label: 'Adventurer' },
  { value: 'croodles', label: 'Croodles' },
];

interface AvatarModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (style: string, seed: string) => Promise<void>;
  currentStyle?: string;
  currentSeed?: string;
}

// Generate a random seed
const generateSeed = () => Math.random().toString(36).substring(2, 15);

// Generate Dicebear URL
const getAvatarUrl = (style: string, seed: string) =>
  `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;

export const AvatarModal: React.FC<AvatarModalProps> = ({
  visible,
  onClose,
  onConfirm,
  currentStyle = 'bottts',
  currentSeed: _currentSeed = '',
}) => {
  const [selectedStyle, setSelectedStyle] = useState(currentStyle);
  const [seeds, setSeeds] = useState<string[]>([]);
  const [selectedSeed, setSelectedSeed] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Generate 15 random seeds (3 rows of 5) when style changes or modal opens
  useEffect(() => {
    if (visible) {
      generateNewAvatars();
      setSelectedSeed(null);
    }
  }, [visible, selectedStyle]);

  const generateNewAvatars = () => {
    setLoading(true);
    const newSeeds = Array.from({ length: 15 }, () => generateSeed());
    setSeeds(newSeeds);
    setSelectedSeed(null);
    // Small delay to show loading state
    setTimeout(() => setLoading(false), 300);
  };

  const handleStyleChange = (style: string) => {
    setSelectedStyle(style);
  };

  const handleSelectAvatar = (seed: string) => {
    setSelectedSeed(seed);
  };

  const handleConfirm = async () => {
    if (!selectedSeed) return;
    setConfirming(true);
    try {
      await onConfirm(selectedStyle, selectedSeed);
      onClose();
    } catch (error) {
      console.error('Failed to update avatar:', error);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Modal
      title="Change Avatar"
      open={visible}
      onCancel={onClose}
      width={680}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="confirm"
          type="primary"
          onClick={handleConfirm}
          disabled={!selectedSeed}
          loading={confirming}
        >
          Save Avatar
        </Button>,
      ]}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {/* Style Selector */}
        <div>
          <Text strong>Avatar Style</Text>
          <Select
            value={selectedStyle}
            onChange={handleStyleChange}
            style={{ width: '100%', marginTop: 8 }}
            options={AVATAR_STYLES}
          />
        </div>

        {/* Regenerate Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text type="secondary">Click an avatar to select it</Text>
          <Button
            icon={<ReloadOutlined />}
            onClick={generateNewAvatars}
            disabled={loading}
          >
            Generate New Avatars
          </Button>
        </div>

        {/* Avatar Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '12px',
              padding: '8px',
            }}
          >
            {seeds.map((seed) => (
              <div
                key={seed}
                onClick={() => handleSelectAvatar(seed)}
                style={{
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '8px',
                  border: selectedSeed === seed ? '3px solid #1890ff' : '3px solid transparent',
                  backgroundColor: selectedSeed === seed ? '#e6f7ff' : '#fafafa',
                  transition: 'all 0.2s',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => {
                  if (selectedSeed !== seed) {
                    e.currentTarget.style.backgroundColor = '#f0f0f0';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedSeed !== seed) {
                    e.currentTarget.style.backgroundColor = '#fafafa';
                  }
                }}
              >
                <img
                  src={getAvatarUrl(selectedStyle, seed)}
                  alt={`Avatar ${seed}`}
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Selected Preview */}
        {selectedSeed && (
          <div style={{ textAlign: 'center', paddingTop: '16px', borderTop: '1px solid #f0f0f0' }}>
            <Text strong>Selected Avatar Preview</Text>
            <div style={{ marginTop: '12px' }}>
              <img
                src={getAvatarUrl(selectedStyle, selectedSeed)}
                alt="Selected avatar"
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  border: '3px solid #1890ff',
                }}
              />
            </div>
          </div>
        )}
      </Space>
    </Modal>
  );
};
