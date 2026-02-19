import { Router, Request, Response, NextFunction } from 'express';
import blockService from '../services/blockService';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * POST /api/blocks/:userId
 * Block a user
 */
router.post(
  '/:userId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const userId = req.params.userId as string;

      await blockService.blockUser(req.user!.userId, userId);

      res.status(200).json({ message: 'User blocked successfully' });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * DELETE /api/blocks/:userId
 * Unblock a user
 */
router.delete(
  '/:userId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const userId = req.params.userId as string;

      await blockService.unblockUser(req.user!.userId, userId);

      res.status(200).json({ message: 'User unblocked successfully' });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/blocks
 * Get blocked users list
 */
router.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await blockService.getBlockedUsers(req.user!.userId, {
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
 * GET /api/blocks/check/:userId
 * Check if a user is blocked
 */
router.get(
  '/check/:userId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const userId = req.params.userId as string;

      const isBlocked = await blockService.isBlocked(req.user!.userId, userId);

      res.status(200).json({ isBlocked });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/blocks/count
 * Get blocked users count
 */
router.get(
  '/count',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const count = await blockService.getBlockedCount(req.user!.userId);

      res.status(200).json({ count });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
