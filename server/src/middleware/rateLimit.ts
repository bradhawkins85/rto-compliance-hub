import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10); // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '5', 10);

/**
 * Rate limiter for login attempts
 * Prevents brute force attacks
 */
export const loginRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  message: {
    type: 'https://tools.ietf.org/html/rfc6585#section-4',
    title: 'Too Many Requests',
    status: 429,
    detail: 'Too many login attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response): void => {
    res.status(429).json({
      type: 'https://tools.ietf.org/html/rfc6585#section-4',
      title: 'Too Many Requests',
      status: 429,
      detail: `Too many login attempts from this IP. Please try again after ${Math.ceil(RATE_LIMIT_WINDOW_MS / 60000)} minutes.`,
      instance: req.path,
    });
  },
});

/**
 * Rate limiter for password reset requests
 */
export const passwordResetRateLimiter = rateLimit({
  windowMs: 3600000, // 1 hour
  max: 3, // 3 requests per hour
  message: {
    type: 'https://tools.ietf.org/html/rfc6585#section-4',
    title: 'Too Many Requests',
    status: 429,
    detail: 'Too many password reset attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response): void => {
    res.status(429).json({
      type: 'https://tools.ietf.org/html/rfc6585#section-4',
      title: 'Too Many Requests',
      status: 429,
      detail: 'Too many password reset requests. Please try again after 1 hour.',
      instance: req.path,
    });
  },
});

/**
 * General API rate limiter
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 100, // 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response): void => {
    res.status(429).json({
      type: 'https://tools.ietf.org/html/rfc6585#section-4',
      title: 'Too Many Requests',
      status: 429,
      detail: 'Too many requests. Please slow down.',
      instance: req.path,
    });
  },
});

/**
 * Rate limiter for file uploads
 * Prevents abuse of upload endpoints
 */
export const fileUploadRateLimiter = rateLimit({
  windowMs: 3600000, // 1 hour
  max: 10, // 10 files per hour
  skipSuccessfulRequests: false,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response): void => {
    res.status(429).json({
      type: 'https://tools.ietf.org/html/rfc6585#section-4',
      title: 'Too Many Requests',
      status: 429,
      detail: 'Too many file uploads. Maximum 10 files per hour allowed. Please try again later.',
      instance: req.path,
    });
  },
});

/**
 * Stricter rate limiter for authentication endpoints per user
 * Tracks by user ID once authenticated
 */
export const createUserRateLimiter = (maxRequests: number = 100, windowMinutes: number = 1) => {
  return rateLimit({
    windowMs: windowMinutes * 60000,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    // Use user ID if authenticated, otherwise use IP
    keyGenerator: (req: Request): string => {
      return req.user?.userId || req.ip || 'unknown';
    },
    handler: (req: Request, res: Response): void => {
      res.status(429).json({
        type: 'https://tools.ietf.org/html/rfc6585#section-4',
        title: 'Too Many Requests',
        status: 429,
        detail: `Rate limit exceeded. Maximum ${maxRequests} requests per ${windowMinutes} minute(s) allowed.`,
        instance: req.path,
      });
    },
  });
};
