import { Router, Request, Response, NextFunction } from 'express';
import automodService from '../services/automodService';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * GET /api/automod/topic/:topicId
 * Get automod rules for a topic
 */
router.get(
  '/topic/:topicId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { topicId } = req.params;

      const rules = await automodService.getTopicRules(topicId);

      return res.status(200).json({ rules });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/automod/topic/:topicId/active
 * Get active automod rules for a topic
 */
router.get(
  '/topic/:topicId/active',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { topicId } = req.params;

      const rules = await automodService.getActiveTopicRules(topicId);

      return res.status(200).json({ rules });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * POST /api/automod
 * Create an automod rule (moderator only)
 */
router.post(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const {
        topicId,
        name,
        conditions,
        action,
        actionData,
        priority,
        enabled,
      } = req.body;

      // Normalize action to uppercase for enum compatibility
      const normalizedAction = action ? (action.toUpperCase() as 'REMOVE' | 'REPORT' | 'FILTER' | 'LOCK' | 'MESSAGE' | 'APPROVE') : action;

      const rule = await automodService.createRule(
        topicId,
        req.user!.userId,
        {
          name,
          conditions,
          action: normalizedAction,
          actionData,
          priority,
          enabled,
        }
      );

      return res.status(201).json({ rule });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/automod/:id
 * Get automod rule by ID
 */
router.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { id } = req.params;

      const rule = await automodService.getRuleById(id);

      return res.status(200).json({ rule });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * PUT /api/automod/:id
 * Update automod rule (moderator only)
 */
router.put(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { id } = req.params;
      const {
        name,
        conditions,
        action,
        actionData,
        enabled,
        priority,
      } = req.body;

      // Normalize action to uppercase for enum compatibility
      const normalizedAction = action ? (action.toUpperCase() as 'REMOVE' | 'REPORT' | 'FILTER' | 'LOCK' | 'MESSAGE' | 'APPROVE') : action;

      const rule = await automodService.updateRule(id, req.user!.userId, {
        name,
        conditions,
        action: normalizedAction,
        actionData,
        enabled,
        priority,
      });

      return res.status(200).json({ rule });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * PATCH /api/automod/:id/toggle
 * Toggle automod rule enabled status
 */
router.patch(
  '/:id/toggle',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { id } = req.params;
      const { enabled } = req.body;

      const rule = await automodService.toggleRule(id, enabled);

      return res.status(200).json({ rule });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * DELETE /api/automod/:id
 * Delete automod rule (moderator only)
 */
router.delete(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { id } = req.params;

      await automodService.deleteRule(id, req.user!.userId);

      return res.status(200).json({ message: 'Automod rule deleted successfully' });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
