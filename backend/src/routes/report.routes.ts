import { Router, Request, Response, NextFunction } from 'express';
import reportService from '../services/reportService';
import { authenticate, requireSuperuser } from '../middleware/auth';
import { generalLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * POST /api/reports
 * Create a report
 */
router.post(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { reason, type, targetId } = req.body;

      // Normalize type to uppercase for enum compatibility
      const normalizedType = type ? (type.toUpperCase() as 'POST' | 'COMMENT') : type;

      const report = await reportService.createReport(
        req.user!.userId,
        normalizedType,
        targetId,
        reason
      );

      res.status(201).json({ report });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/reports/queue
 * Get moderator queue
 */
router.get(
  '/queue',
  authenticate,
  generalLimiter,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await reportService.getReportsByStatus('PENDING', {
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
 * GET /api/reports
 * Get all reports (admin only)
 */
router.get(
  '/',
  authenticate,
  requireSuperuser,
  generalLimiter,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status ? (req.query.status as string).toUpperCase() as 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED' : undefined;

      const result = await reportService.getAllReports({ page, limit }, status);

      res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/reports/:id
 * Get report by ID
 */
router.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { id } = req.params;

      const report = await reportService.getReportById(id);

      res.status(200).json({ report });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * PUT /api/reports/:id/resolve
 * Resolve a report
 */
router.put(
  '/:id/resolve',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { id } = req.params;
      const { resolution } = req.body;

      const report = await reportService.resolveReport(
        id,
        req.user!.userId,
        resolution
      );

      res.status(200).json({ report });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * PUT /api/reports/:id/dismiss
 * Dismiss a report
 */
router.put(
  '/:id/dismiss',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { id } = req.params;

      const report = await reportService.dismissReport(id, req.user!.userId);

      res.status(200).json({ report });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
