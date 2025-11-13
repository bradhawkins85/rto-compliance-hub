import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * CSRF Token Management
 * Implements token-based CSRF protection for state-changing operations
 */

const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_EXPIRY = 3600000; // 1 hour in milliseconds

// In-memory token store (use Redis in production for scalability)
const tokenStore = new Map<string, { token: string; expiresAt: number }>();

/**
 * Generate a cryptographically secure CSRF token
 */
function generateCsrfToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Middleware to generate and set CSRF token
 * Should be used on routes that render forms or return tokens
 */
export function csrfTokenGenerator(req: Request, res: Response, next: NextFunction): void {
  // Generate new token
  const token = generateCsrfToken();
  const sessionId = req.user?.userId || req.sessionID || req.ip || 'anonymous';
  
  // Store token with expiry
  tokenStore.set(sessionId, {
    token,
    expiresAt: Date.now() + CSRF_TOKEN_EXPIRY,
  });
  
  // Set token in cookie (httpOnly, secure in production)
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: CSRF_TOKEN_EXPIRY,
  });
  
  // Also attach to response object for API responses
  res.locals.csrfToken = token;
  
  next();
}

/**
 * Middleware to validate CSRF token on state-changing requests
 * Should be used on POST, PUT, PATCH, DELETE routes
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Skip CSRF check for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  const sessionId = req.user?.userId || req.sessionID || req.ip || 'anonymous';
  
  // Get token from header or body
  const providedToken = req.headers[CSRF_HEADER_NAME] as string || req.body?._csrf;
  
  if (!providedToken) {
    res.status(403).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.5.3',
      title: 'Forbidden',
      status: 403,
      detail: 'CSRF token missing. Include the token in the X-CSRF-Token header or _csrf body field.',
      instance: req.path,
    });
    return;
  }
  
  // Get stored token
  const storedData = tokenStore.get(sessionId);
  
  if (!storedData) {
    res.status(403).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.5.3',
      title: 'Forbidden',
      status: 403,
      detail: 'CSRF token not found or expired',
      instance: req.path,
    });
    return;
  }
  
  // Check if token expired
  if (Date.now() > storedData.expiresAt) {
    tokenStore.delete(sessionId);
    res.status(403).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.5.3',
      title: 'Forbidden',
      status: 403,
      detail: 'CSRF token expired',
      instance: req.path,
    });
    return;
  }
  
  // Validate token (constant-time comparison to prevent timing attacks)
  // Check if buffers have the same length first
  if (providedToken.length !== storedData.token.length) {
    res.status(403).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.5.3',
      title: 'Forbidden',
      status: 403,
      detail: 'Invalid CSRF token',
      instance: req.path,
    });
    return;
  }
  
  const isValid = crypto.timingSafeEqual(
    Buffer.from(providedToken),
    Buffer.from(storedData.token)
  );
  
  if (!isValid) {
    res.status(403).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.5.3',
      title: 'Forbidden',
      status: 403,
      detail: 'Invalid CSRF token',
      instance: req.path,
    });
    return;
  }
  
  next();
}

/**
 * Clean up expired tokens periodically
 */
export function cleanupExpiredTokens(): void {
  const now = Date.now();
  for (const [sessionId, data] of tokenStore.entries()) {
    if (now > data.expiresAt) {
      tokenStore.delete(sessionId);
    }
  }
}

// Run cleanup every 10 minutes
setInterval(cleanupExpiredTokens, 600000);

/**
 * Get CSRF token for the current session
 * Used by API endpoints to return token to clients
 */
export function getCsrfToken(req: Request, res: Response): void {
  const token = res.locals.csrfToken;
  
  if (!token) {
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'CSRF token not generated',
      instance: req.path,
    });
    return;
  }
  
  res.json({ csrfToken: token });
}
