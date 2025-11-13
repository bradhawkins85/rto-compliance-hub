import { Request, Response, NextFunction } from 'express';
import path from 'path';

/**
 * Input Sanitization Middleware
 * Prevents XSS, SQL injection, command injection, and path traversal attacks
 */

/**
 * XSS Prevention - Sanitize string inputs to remove potentially malicious scripts
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return input;
  }
  
  return input
    // Remove script tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove event handlers (onclick, onerror, etc.)
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]*/gi, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove data: protocol for images (can be used for XSS)
    .replace(/<img[^>]+src\s*=\s*["']data:[^"']*["']/gi, '')
    // Remove iframe tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    // HTML encode special characters
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * SQL Injection Prevention - Validate and sanitize inputs
 * Note: Primary defense is using parameterized queries (Prisma does this)
 * This is an additional layer
 */
export function sanitizeSqlInput(input: string): string {
  if (typeof input !== 'string') {
    return input;
  }
  
  return input
    // Remove SQL comment sequences
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    // Remove semicolons (used to chain queries)
    .replace(/;/g, '')
    // Remove UNION keyword (used in injection attacks)
    .replace(/UNION/gi, '')
    // Remove common SQL keywords used in attacks
    .replace(/DROP/gi, '')
    .replace(/DELETE/gi, '')
    .replace(/INSERT/gi, '')
    .replace(/UPDATE/gi, '')
    .replace(/EXEC/gi, '')
    .replace(/EXECUTE/gi, '')
    .replace(/SCRIPT/gi, '');
}

/**
 * Path Traversal Prevention - Sanitize file paths
 */
export function sanitizeFilePath(filePath: string): string {
  if (typeof filePath !== 'string') {
    throw new Error('File path must be a string');
  }
  
  // Check for absolute paths first (before any modification)
  if (filePath.startsWith('/') || /^[a-zA-Z]:/.test(filePath)) {
    throw new Error('Absolute paths are not allowed');
  }
  
  // Normalize slashes
  let sanitized = filePath.replace(/\\/g, '/');
  
  // Remove all ".." sequences (both normalized and raw)
  sanitized = sanitized.replace(/\.\./g, '');
  
  // Normalize multiple slashes
  sanitized = sanitized.replace(/\/+/g, '/');
  
  // Trim leading/trailing slashes from the result
  sanitized = sanitized.replace(/^\/+|\/+$/g, '');
  
  return sanitized;
}

/**
 * Command Injection Prevention - Validate inputs that might be used in system commands
 */
export function sanitizeCommandInput(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('Command input must be a string');
  }
  
  // Remove shell metacharacters and operators
  const dangerous = [
    ';', '|', '&', '$', '`', '\n', '\r',
    '>', '<', '(', ')', '{', '}', '[', ']',
    '*', '?', '~', '!', '^', '\\', '"', "'"
  ];
  
  let sanitized = input;
  for (const char of dangerous) {
    sanitized = sanitized.replace(new RegExp(`\\${char}`, 'g'), '');
  }
  
  return sanitized;
}

/**
 * Recursive sanitization for objects
 */
function sanitizeObject(obj: any, sanitizeFunc: (val: string) => string): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return sanitizeFunc(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, sanitizeFunc));
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key], sanitizeFunc);
      }
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Middleware to sanitize all request inputs for XSS
 */
export function xssProtection(req: Request, res: Response, next: NextFunction): void {
  try {
    // Sanitize body
    if (req.body) {
      req.body = sanitizeObject(req.body, sanitizeString);
    }
    
    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeObject(req.query, sanitizeString);
    }
    
    // Sanitize URL parameters
    if (req.params) {
      req.params = sanitizeObject(req.params, sanitizeString);
    }
    
    next();
  } catch (error) {
    console.error('XSS protection error:', error);
    res.status(400).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
      title: 'Bad Request',
      status: 400,
      detail: 'Invalid input detected',
      instance: req.path,
    });
  }
}

/**
 * Middleware to validate file paths in requests
 */
export function pathTraversalProtection(req: Request, res: Response, next: NextFunction): void {
  try {
    // Check body for file paths
    if (req.body?.filePath) {
      req.body.filePath = sanitizeFilePath(req.body.filePath);
    }
    
    if (req.body?.path) {
      req.body.path = sanitizeFilePath(req.body.path);
    }
    
    // Check query parameters for file paths (need to handle as strings)
    if (req.query?.filePath && typeof req.query.filePath === 'string') {
      req.query.filePath = sanitizeFilePath(req.query.filePath);
    }
    
    if (req.query?.path && typeof req.query.path === 'string') {
      req.query.path = sanitizeFilePath(req.query.path);
    }
    
    next();
  } catch (error) {
    console.error('Path traversal protection error:', error);
    res.status(400).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
      title: 'Bad Request',
      status: 400,
      detail: 'Invalid file path detected',
      instance: req.path,
    });
  }
}

/**
 * Validate that input doesn't contain dangerous patterns
 */
export function validateNoInjection(input: string): boolean {
  if (typeof input !== 'string') {
    return true;
  }
  
  // Check for SQL injection patterns
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(\bUNION\b.*\bSELECT\b)/gi,
    /[';]+\s*(OR|AND)\s*[';'0-9=\s]+/gi, // Detects patterns like ' OR '1'='1'
  ];
  
  // Check for command injection patterns
  const cmdPatterns = [
    /[;&|`$(){}[\]]/,
    /(\n|\r)/,
  ];
  
  // Check for XSS patterns
  const xssPatterns = [
    /<script/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
  ];
  
  const allPatterns = [...sqlPatterns, ...cmdPatterns, ...xssPatterns];
  
  for (const pattern of allPatterns) {
    if (pattern.test(input)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Middleware for strict input validation
 */
export function strictInputValidation(req: Request, res: Response, next: NextFunction): void {
  try {
    const checkValue = (value: any): boolean => {
      if (typeof value === 'string') {
        return validateNoInjection(value);
      }
      if (Array.isArray(value)) {
        return value.every(checkValue);
      }
      if (typeof value === 'object' && value !== null) {
        return Object.values(value).every(checkValue);
      }
      return true;
    };
    
    // Check all inputs
    const allInputs = { ...req.body, ...req.query, ...req.params };
    
    if (!checkValue(allInputs)) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'Input contains potentially malicious content',
        instance: req.path,
      });
      return;
    }
    
    next();
  } catch (error) {
    console.error('Input validation error:', error);
    res.status(400).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
      title: 'Bad Request',
      status: 400,
      detail: 'Input validation failed',
      instance: req.path,
    });
  }
}
