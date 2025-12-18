import React, { useState } from 'react';
import { Modal, Form, Input, Radio, Checkbox, Space, Alert, Select } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { ImageUploader, RichTextEditor } from '../../components';
import { tagApi } from '../../services/api/tag.api';
import { toast } from 'sonner';

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    type: 'text' | 'link' | 'image';
    content?: string;
    linkUrl?: string;
    imageUrl?: string;
    isNSFW: boolean;
    isSpoiler: boolean;
    tagId?: string;
  }) => Promise<void>;
  topicName: string;
  topicId?: string;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  visible,
  onClose,
  onSubmit,
  topicName,
  topicId,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [postType, setPostType] = useState<'text' | 'link' | 'image'>('text');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [selectedTagId, setSelectedTagId] = useState<string | undefined>(undefined);

  // Fetch available tags for this topic
  const { data: tagsData } = useQuery({
    queryKey: ['topic', topicId, 'tags'],
    queryFn: () => tagApi.getTopicTags(topicId!),
    enabled: !!topicId && visible,
  });

  const tags = tagsData?.tags || [];

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // Validate content for text posts
      if (postType === 'text' && !content.trim()) {
        toast.error('Please enter some content');
        return;
      }

      setLoading(true);

      await onSubmit({
        title: values.title,
        type: postType,
        content: postType === 'text' ? content : undefined,
        linkUrl: postType === 'link' ? values.linkUrl : undefined,
        imageUrl: postType === 'image' ? imageUrl : undefined,
        isNSFW: values.isNSFW || false,
        isSpoiler: values.isSpoiler || false,
        tagId: selectedTagId,
      });

      form.resetFields();
      setImageUrl('');
      setContent('');
      setSelectedTagId(undefined);
      toast.success('Post created successfully!');
      onClose();
    } catch (error: any) {
      if (error.errorFields) {
        // Form validation error
        return;
      }
      console.error('Create post error:', error);
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || error.message || 'Failed to create post';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setImageUrl('');
    setContent('');
    setPostType('text');
    setSelectedTagId(undefined);
    onClose();
  };

  const handleImageUpload = (url: string) => {
    setImageUrl(url);
    toast.success('Image uploaded!');
  };

  return (
    <Modal
      title={`Create a Post in t/${topicName}`}
      open={visible}
      onOk={handleSubmit}
      onCancel={handleCancel}
      okText="Create Post"
      confirmLoading={loading}
      width={700}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
      >
        {/* Post Type */}
        <Form.Item label="Post Type">
          <Radio.Group value={postType} onChange={(e) => setPostType(e.target.value)}>
            <Radio.Button value="text">Text</Radio.Button>
            <Radio.Button value="link">Link</Radio.Button>
            <Radio.Button value="image">Image</Radio.Button>
          </Radio.Group>
        </Form.Item>

        {/* Title */}
        <Form.Item
          name="title"
          label="Title"
          rules={[
            { required: true, message: 'Please enter a title' },
            { max: 300, message: 'Title must be less than 300 characters' },
          ]}
        >
          <Input
            placeholder="Enter a descriptive title"
            maxLength={300}
            showCount
          />
        </Form.Item>

        {/* Tag Picker */}
        {tags.length > 0 && (
          <Form.Item label="Post Tag (Optional)">
            <Select
              value={selectedTagId}
              onChange={setSelectedTagId}
              placeholder="Select a tag for your post"
              allowClear
              style={{ width: '100%' }}
            >
              {tags.map((tag: any) => (
                <Select.Option key={tag.id} value={tag.id}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: tag.bgColor || '#1890ff',
                        color: tag.textColor || '#ffffff',
                        fontSize: '12px',
                      }}
                    >
                      {tag.name}
                    </span>
                  </span>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {/* Text Content */}
        {postType === 'text' && (
          <Form.Item
            label="Content"
          >
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Write your post content..."
              minHeight={200}
            />
          </Form.Item>
        )}

        {/* Link URL */}
        {postType === 'link' && (
          <Form.Item
            name="linkUrl"
            label="Link URL"
            rules={[
              { required: true, message: 'Please enter a URL' },
              { type: 'url', message: 'Please enter a valid URL' },
            ]}
          >
            <Input
              placeholder="https://example.com"
              type="url"
            />
          </Form.Item>
        )}

        {/* Image Upload */}
        {postType === 'image' && (
          <Form.Item label="Image">
            {imageUrl ? (
              <div>
                <img
                  src={imageUrl}
                  alt="Upload preview"
                  style={{ maxWidth: '100%', maxHeight: '400px', marginBottom: '8px' }}
                />
                <Alert
                  message="Image uploaded successfully"
                  type="success"
                  showIcon
                />
              </div>
            ) : (
              <ImageUploader
                onUploadSuccess={handleImageUpload}
                maxSize={5}
                uploadType="image"
              />
            )}
          </Form.Item>
        )}

        {/* Content Warnings */}
        <Form.Item label="Content Warnings">
          <Space direction="vertical">
            <Form.Item name="isNSFW" valuePropName="checked" noStyle>
              <Checkbox>Mark as NSFW (Not Safe For Work)</Checkbox>
            </Form.Item>
            <Form.Item name="isSpoiler" valuePropName="checked" noStyle>
              <Checkbox>Mark as Spoiler</Checkbox>
            </Form.Item>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};
