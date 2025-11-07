import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JWTPayload } from '../utils/jwt';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Authentication middleware - verifies JWT token
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    // Get token from Authorization header or cookies
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      res.status(401).json({
        type: 'https://tools.ietf.org/html/rfc7235#section-3.1',
        title: 'Unauthorized',
        status: 401,
        detail: 'Authentication required',
        instance: req.path,
      });
      return;
    }

    // Verify token
    const decoded = verifyAccessToken(token);
    req.user = decoded;

    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Invalid token';
    
    res.status(401).json({
      type: 'https://tools.ietf.org/html/rfc7235#section-3.1',
      title: 'Unauthorized',
      status: 401,
      detail: errorMessage,
      instance: req.path,
    });
  }
}

/**
 * Optional authentication middleware - verifies token if present but doesn't require it
 */
export function optionalAuthenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    // Get token from Authorization header or cookies
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (token) {
      // Verify token if present
      const decoded = verifyAccessToken(token);
      req.user = decoded;
    }

    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
}
