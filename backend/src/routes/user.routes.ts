import { Router, Request, Response, NextFunction } from 'express';
import userService from '../services/userService';
import savedPostService from '../services/savedPostService';
import { authenticate } from '../middleware/auth';
import { generalLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * GET /api/users/:username
 * Get user profile by username
 */
router.get(
  '/:username',
  generalLimiter,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { username } = req.params;
      const user = await userService.getUserByUsername(username);

      res.status(200).json({ user });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * PUT /api/users/me
 * Update current user profile
 */
router.put(
  '/me',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { displayName, bio, website } = req.body;

      const user = await userService.updateUser(req.user!.userId, {
        displayName,
        bio,
        website,
      });

      res.status(200).json({ user });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * PUT /api/users/me/password
 * Update password
 */
router.put(
  '/me/password',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { oldPassword, newPassword } = req.body;

      await userService.updatePassword(
        req.user!.userId,
        oldPassword,
        newPassword
      );

      res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * PUT /api/users/me/avatar
 * Update avatar
 */
router.put(
  '/me/avatar',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { avatarStyle, avatarSeed } = req.body;

      const user = await userService.updateAvatar(
        req.user!.userId,
        avatarStyle,
        avatarSeed
      );

      res.status(200).json({ user });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/users/:username/posts
 * Get user's posts
 */
router.get(
  '/:username/posts',
  generalLimiter,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { username } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await userService.getUserPosts(username, { page, limit });

      res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/users/:username/comments
 * Get user's comments
 */
router.get(
  '/:username/comments',
  generalLimiter,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { username } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await userService.getUserComments(username, { page, limit });

      res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/users/me/saved
 * Get current user's saved posts
 */
router.get(
  '/me/saved',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await savedPostService.getSavedPosts(req.user!.userId, {
        page,
        limit,
      });

      res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * DELETE /api/users/me/saved
 * Clear all saved posts
 */
router.delete(
  '/me/saved',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      await savedPostService.clearAllSavedPosts(req.user!.userId);

      res.status(200).json({ message: 'All saved posts cleared' });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * POST /api/users/me/verify-email
 * Send email verification
 */
router.post(
  '/me/verify-email',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      await userService.sendEmailVerification(req.user!.userId);

      res.status(200).json({ message: 'Verification email sent' });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * DELETE /api/users/me
 * Delete account
 */
router.delete(
  '/me',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { password, confirmText } = req.body;

      await userService.deleteAccount(req.user!.userId, password, confirmText);

      res.status(200).json({ message: 'Account deleted successfully' });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
