import { Router, Request, Response, NextFunction } from 'express';
import authService from '../services/authService';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post(
  '/register',
  authLimiter,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { email, username, password, agreedToTerms } = req.body;

      const result = await authService.register(
        email,
        username,
        password,
        agreedToTerms
      );

      res.status(201).json({
        message: 'Registration successful',
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post(
  '/login',
  authLimiter,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { email, password } = req.body;

      const result = await authService.login(email, password);

      res.status(200).json({
        message: 'Login successful',
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post(
  '/refresh',
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const { refreshToken } = req.body;

      const result = await authService.refreshToken(refreshToken);

      res.status(200).json({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get(
  '/me',
  authenticate,
  async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const user = await authService.getCurrentUser(req.user!.userId);

      res.status(200).json({ user });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * POST /api/auth/logout
 * Logout (client-side token removal, optional server-side blacklist)
 */
router.post(
  '/logout',
  authenticate,
  async (_req: Request, res: Response, next: NextFunction)=> {
    try {
      // In a production app, you might want to blacklist the token here
      // For now, we'll just return success and let client remove the token

      res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
