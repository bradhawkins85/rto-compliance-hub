/**
 * Monitoring Middleware
 * 
 * Tracks HTTP requests and response times for monitoring and alerting
 */

import { Request, Response, NextFunction } from 'express';
import { metricsService } from '../services/metrics';

/**
 * Request monitoring middleware
 * Tracks request metrics including duration, status codes, and errors
 */
export const monitoringMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Store original end function
  const originalEnd = res.end;
  
  // Override end function to capture metrics
  res.end = function(this: Response, chunk?: any, encoding?: BufferEncoding, cb?: () => void): Response {
    const duration = Date.now() - startTime;
    
    // Record request metrics
    metricsService.recordRequest(
      req.method,
      req.path,
      res.statusCode,
      duration
    );
    
    // Log slow requests (>2 seconds)
    if (duration > 2000) {
      console.warn(`⚠️  Slow request detected: ${req.method} ${req.path} took ${duration}ms`);
    }
    
    // Call original end function
    if (encoding) {
      return originalEnd.call(this, chunk, encoding, cb);
    } else if (chunk) {
      return originalEnd.call(this, chunk, cb as any);
    }
    return originalEnd.call(this);
  };
  
  next();
};

/**
 * Error tracking middleware
 * Captures and logs errors for monitoring
 */
export const errorTrackingMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error with context
  console.error('Error occurred:', {
    timestamp: new Date().toISOString(),
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    },
    request: {
      method: req.method,
      path: req.path,
      query: req.query,
      headers: {
        'user-agent': req.headers['user-agent'],
        'referer': req.headers['referer'],
      },
      ip: req.ip,
    },
  });
  
  // Increment error counter
  metricsService.incrementCounter('http_errors_total', 1, {
    method: req.method,
    path: req.path,
    error: err.name,
  });
  
  next(err);
};
