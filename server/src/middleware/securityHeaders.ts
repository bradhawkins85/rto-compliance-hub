import { Request, Response, NextFunction } from 'express';
import { HelmetOptions } from 'helmet';

/**
 * Enhanced Security Headers Configuration
 * Implements comprehensive security headers as per OWASP recommendations
 */

/**
 * Get Helmet configuration with all required security headers
 */
export function getSecurityHeadersConfig(): HelmetOptions {
  return {
    // Content Security Policy - Prevents XSS and other injection attacks
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for React
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    
    // Strict Transport Security - Enforces HTTPS
    hsts: {
      maxAge: 31536000, // 1 year in seconds
      includeSubDomains: true,
      preload: true,
    },
    
    // X-Frame-Options - Prevents clickjacking
    frameguard: {
      action: 'deny',
    },
    
    // X-Content-Type-Options - Prevents MIME sniffing
    noSniff: true,
    
    // X-DNS-Prefetch-Control - Controls DNS prefetching
    dnsPrefetchControl: {
      allow: false,
    },
    
    // Referrer-Policy - Controls referrer information
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
    
    // X-Permitted-Cross-Domain-Policies
    permittedCrossDomainPolicies: {
      permittedPolicies: 'none',
    },
    
    // Hide X-Powered-By header
    hidePoweredBy: true,
    
    // X-Download-Options for IE8+
    ieNoOpen: true,
    
    // X-XSS-Protection (legacy but still useful for older browsers)
    xssFilter: true,
  };
}

/**
 * Permissions Policy (formerly Feature Policy)
 * Controls which browser features and APIs can be used
 */
export function permissionsPolicy(req: Request, res: Response, next: NextFunction): void {
  res.setHeader(
    'Permissions-Policy',
    [
      'geolocation=()',
      'microphone=()',
      'camera=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'speaker=()',
      'vibrate=()',
      'fullscreen=(self)',
      'sync-xhr=()',
    ].join(', ')
  );
  next();
}

/**
 * Additional security headers not covered by Helmet
 */
export function additionalSecurityHeaders(req: Request, res: Response, next: NextFunction): void {
  // X-Content-Type-Options
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // X-Frame-Options
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Referrer-Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Cross-Origin-Opener-Policy
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  
  // Cross-Origin-Resource-Policy
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  
  // Cross-Origin-Embedder-Policy
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  
  // X-DNS-Prefetch-Control
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  
  // Expect-CT (deprecated but still useful)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Expect-CT', 'max-age=86400, enforce');
  }
  
  next();
}

/**
 * Secure cookie configuration
 */
export function getSecureCookieConfig() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/',
    signed: false, // Set to true if using cookie signing
  };
}

/**
 * TLS/SSL configuration recommendations
 * Note: This should be configured at the reverse proxy/load balancer level
 * (e.g., Nginx, Apache, or cloud provider)
 */
export function getTlsConfig() {
  return {
    // Minimum TLS version
    minVersion: 'TLSv1.3',
    
    // Recommended cipher suites for TLS 1.3
    ciphers: [
      'TLS_AES_128_GCM_SHA256',
      'TLS_AES_256_GCM_SHA384',
      'TLS_CHACHA20_POLY1305_SHA256',
    ].join(':'),
    
    // Prefer server cipher order
    honorCipherOrder: true,
    
    // Session settings
    sessionTimeout: 300, // 5 minutes
    
    // OCSP stapling
    enableOcspStapling: true,
  };
}

/**
 * Middleware to check if request is using HTTPS in production
 */
export function enforceHttps(req: Request, res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV === 'production') {
    // Check if request is secure
    const isSecure = req.secure || 
                     req.headers['x-forwarded-proto'] === 'https' ||
                     req.headers['x-forwarded-ssl'] === 'on';
    
    if (!isSecure) {
      return res.status(403).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.3',
        title: 'Forbidden',
        status: 403,
        detail: 'HTTPS is required',
        instance: req.path,
      });
    }
  }
  
  next();
}

/**
 * Middleware to validate TLS version (when behind a proxy that sets headers)
 */
export function validateTlsVersion(req: Request, res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV === 'production') {
    const tlsVersion = req.headers['x-tls-version'] as string;
    
    if (tlsVersion && !['TLSv1.3', 'TLSv1.2'].includes(tlsVersion)) {
      return res.status(403).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.3',
        title: 'Forbidden',
        status: 403,
        detail: 'TLS 1.2 or higher is required',
        instance: req.path,
      });
    }
  }
  
  next();
}

/**
 * Security headers audit - logs current security headers
 */
export function auditSecurityHeaders(req: Request, res: Response): void {
  const headers = {
    'Content-Security-Policy': res.getHeader('Content-Security-Policy'),
    'Strict-Transport-Security': res.getHeader('Strict-Transport-Security'),
    'X-Frame-Options': res.getHeader('X-Frame-Options'),
    'X-Content-Type-Options': res.getHeader('X-Content-Type-Options'),
    'Referrer-Policy': res.getHeader('Referrer-Policy'),
    'Permissions-Policy': res.getHeader('Permissions-Policy'),
    'X-XSS-Protection': res.getHeader('X-XSS-Protection'),
    'X-DNS-Prefetch-Control': res.getHeader('X-DNS-Prefetch-Control'),
  };
  
  res.json({
    headers,
    secure: req.secure,
    protocol: req.protocol,
  });
}
