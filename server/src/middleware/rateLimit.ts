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
  // Use IP address and email (if available) for rate limiting
  keyGenerator: (req: Request): string => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const email = req.body?.email || '';
    return `${ip}-${email}`;
  },
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
  keyGenerator: (req: Request): string => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const email = req.body?.email || '';
    return `${ip}-${email}`;
  },
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
