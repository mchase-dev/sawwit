import React, { useState } from 'react';
import { Upload, message } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { uploadApi } from '../../services/api';

const { Dragger } = Upload;

interface ImageUploaderProps {
  onUploadSuccess: (url: string, filename: string) => void;
  maxSize?: number; // in MB
  accept?: string;
  uploadType?: 'image' | 'avatar';
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onUploadSuccess,
  maxSize = 5,
  accept = 'image/jpeg,image/jpg,image/png,image/gif,image/webp',
  uploadType = 'image',
}) => {
  const [uploading, setUploading] = useState(false);

  const uploadProps: UploadProps = {
    name: uploadType,
    multiple: false,
    accept,
    beforeUpload: (file) => {
      const isValidType = file.type.startsWith('image/');
      if (!isValidType) {
        message.error('You can only upload image files!');
        return false;
      }

      const isValidSize = file.size / 1024 / 1024 < maxSize;
      if (!isValidSize) {
        message.error(`Image must be smaller than ${maxSize}MB!`);
        return false;
      }

      return true;
    },
    customRequest: async ({ file, onSuccess, onError }) => {
      try {
        setUploading(true);
        const uploadFile = file as File;

        const response = uploadType === 'avatar'
          ? await uploadApi.uploadAvatar(uploadFile)
          : await uploadApi.uploadImage(uploadFile);

        onUploadSuccess(response.url, response.filename);
        onSuccess?.(response);
        message.success('Image uploaded successfully!');
      } catch (error: any) {
        console.error('Upload error:', error);
        onError?.(error);
        message.error(error.response?.data?.error || 'Upload failed!');
      } finally {
        setUploading(false);
      }
    },
  };

  return (
    <Dragger {...uploadProps} disabled={uploading}>
      <p className="ant-upload-drag-icon">
        <InboxOutlined />
      </p>
      <p className="ant-upload-text">Click or drag image to this area to upload</p>
      <p className="ant-upload-hint">
        Support for JPG, PNG, GIF, WEBP. Maximum file size: {maxSize}MB
      </p>
    </Dragger>
  );
};
