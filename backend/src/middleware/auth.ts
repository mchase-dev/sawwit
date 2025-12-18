import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JWTPayload } from '../utils/jwt';

// Extend Express Request to include user and topic
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      topic?: any; // Topic will be attached by middleware
    }
  }
}

/**
 * Middleware to authenticate requests using JWT
 * Adds user payload to req.user if token is valid
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const payload = verifyAccessToken(token);
    if (!payload) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Attach user to request
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Optional authentication - doesn't fail if no token provided
 * Useful for endpoints that work for both authenticated and anonymous users
 */
export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyAccessToken(token);
      if (payload) {
        req.user = payload;
      }
    }
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
}

/**
 * Middleware to check if user is a superuser
 */
export function requireSuperuser(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (!req.user.isSuperuser) {
    res.status(403).json({ error: 'Superuser access required' });
    return;
  }

  next();
}

/**
 * Middleware to check if user is authenticated
 * Alias for authenticate, but with clearer intent
 */
export const requireAuth = authenticate;

/**
 * Alias for optionalAuthenticate
 */
export const optionalAuth = optionalAuthenticate;
