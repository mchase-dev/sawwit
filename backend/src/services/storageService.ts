import * as fs from 'fs';
import * as path from 'path';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { UploadResult } from '../types';

const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || 'local';
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '5242880', 10); // 5MB

// S3 configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const S3_BUCKET = process.env.AWS_S3_BUCKET || '';

/**
 * Storage service for handling file uploads
 */
class StorageService {
  /**
   * Upload a file
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'general'
  ): Promise<UploadResult> {
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum of ${MAX_FILE_SIZE} bytes`);
    }

    if (STORAGE_PROVIDER === 's3') {
      return this.uploadToS3(file, folder);
    } else {
      return this.uploadToLocal(file, folder);
    }
  }

  /**
   * Upload file to local storage
   */
  private async uploadToLocal(
    file: Express.Multer.File,
    folder: string
  ): Promise<UploadResult> {
    // Ensure upload directory exists
    const uploadPath = path.join(UPLOAD_DIR, folder);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const filename = `${timestamp}-${Math.random().toString(36).substring(7)}${ext}`;
    const filepath = path.join(uploadPath, filename);

    // Write file
    await fs.promises.writeFile(filepath, file.buffer);

    const url = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/uploads/${folder}/${filename}`;

    return {
      url,
      filename,
      size: file.size,
    };
  }

  /**
   * Upload file to S3
   */
  private async uploadToS3(
    file: Express.Multer.File,
    folder: string
  ): Promise<UploadResult> {
    // Generate unique filename
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const filename = `${folder}/${timestamp}-${Math.random().toString(36).substring(7)}${ext}`;

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: filename,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read',
    });

    await s3Client.send(command);

    const url = `https://${S3_BUCKET}.s3.amazonaws.com/${filename}`;

    return {
      url,
      filename,
      size: file.size,
    };
  }

  /**
   * Delete a file
   */
  async deleteFile(filename: string, folder: string = 'general'): Promise<void> {
    if (STORAGE_PROVIDER === 's3') {
      await this.deleteFromS3(`${folder}/${filename}`);
    } else {
      await this.deleteFromLocal(filename, folder);
    }
  }

  /**
   * Delete file from local storage
   */
  private async deleteFromLocal(filename: string, folder: string): Promise<void> {
    const filepath = path.join(UPLOAD_DIR, folder, filename);
    if (fs.existsSync(filepath)) {
      await fs.promises.unlink(filepath);
    }
  }

  /**
   * Delete file from S3
   */
  private async deleteFromS3(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    });
    await s3Client.send(command);
  }

  /**
   * Validate image file
   */
  validateImageFile(file: Express.Multer.File): void {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum of ${MAX_FILE_SIZE} bytes`);
    }
  }
}

export default new StorageService();
