import { Router, Request, Response, NextFunction } from 'express';
import { uploadImage, uploadAvatar } from '../config/multer';
import storageService from '../services/storageService';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * POST /api/upload/image
 * Upload an image for a post
 */
router.post(
  '/image',
  authenticate,
  uploadImage.single('image'),
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const result = await storageService.uploadFile(req.file, 'posts');

      res.status(200).json({
        message: 'Image uploaded successfully',
        url: result.url,
        filename: result.filename,
      });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * POST /api/upload/avatar
 * Upload an avatar image
 */
router.post(
  '/avatar',
  authenticate,
  uploadAvatar.single('avatar'),
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const result = await storageService.uploadFile(req.file, 'avatars');

      res.status(200).json({
        message: 'Avatar uploaded successfully',
        url: result.url,
        filename: result.filename,
      });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * DELETE /api/upload/:filename
 * Delete an uploaded file
 */
router.delete(
  '/:filename',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { filename } = req.params;
      const folder = (req.query.folder as string) || 'general';

      await storageService.deleteFile(filename, folder);

      res.status(200).json({ message: 'File deleted successfully' });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
