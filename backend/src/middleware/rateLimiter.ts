import rateLimit from 'express-rate-limit';

// Disable rate limiting in test environment
const isTestEnvironment = process.env.NODE_ENV === 'test';

/**
 * General rate limiter for most API endpoints
 */
export const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10), // 100 requests per minute
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnvironment,
});

/**
 * Strict rate limiter for authentication endpoints
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many authentication attempts, please try again later',
  skipSuccessfulRequests: false,
  skip: () => isTestEnvironment,
});

/**
 * Rate limiter for registration
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour per IP
  message: 'Too many accounts created from this IP, please try again later',
  skip: () => isTestEnvironment,
});

/**
 * Rate limiter for creating posts
 */
export const createPostLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 posts per minute
  message: 'You are creating posts too quickly, please slow down',
  skip: () => isTestEnvironment,
});

/**
 * Rate limiter for creating comments
 */
export const createCommentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 comments per minute
  message: 'You are commenting too quickly, please slow down',
  skip: () => isTestEnvironment,
});

/**
 * Rate limiter for voting
 */
export const voteLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 votes per minute
  message: 'You are voting too quickly, please slow down',
  skip: () => isTestEnvironment,
});

/**
 * Rate limiter for sending direct messages
 */
export const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 messages per minute
  message: 'You are sending messages too quickly, please slow down',
  skip: () => isTestEnvironment,
});

/**
 * Rate limiter for creating reports
 */
export const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 reports per hour
  message: 'You have submitted too many reports, please try again later',
  skip: () => isTestEnvironment,
});

/**
 * Rate limiter for email verification requests
 */
export const emailVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  message: 'Too many verification emails requested, please try again later',
  skip: () => isTestEnvironment,
});

/**
 * Rate limiter for password reset requests
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  message: 'Too many password reset requests, please try again later',
  skip: () => isTestEnvironment,
});
